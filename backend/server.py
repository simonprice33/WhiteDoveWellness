"""
White Dove Wellness Backend
Python FastAPI wrapper that proxies requests to Node.js Express server
"""

import subprocess
import os
import sys
import signal
import time
import asyncio
import httpx
from fastapi import FastAPI, Request, Response
from fastapi.responses import JSONResponse, StreamingResponse
from starlette.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager
import logging
from pathlib import Path

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

# Load environment
from dotenv import load_dotenv
ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# Node.js server management
node_process = None
NODE_SERVER_URL = "http://127.0.0.1:3001"

def start_node_server():
    global node_process
    logger.info("🚀 Starting Node.js Express server...")
    
    env = os.environ.copy()
    env['NODE_PORT'] = '3001'
    
    node_process = subprocess.Popen(
        ['node', 'server.js'],
        cwd=str(ROOT_DIR),
        env=env,
        stdout=subprocess.PIPE,
        stderr=subprocess.STDOUT
    )
    
    # Read initial output
    def log_output():
        for line in iter(node_process.stdout.readline, b''):
            if line:
                logger.info(f"[Node] {line.decode().strip()}")
    
    import threading
    log_thread = threading.Thread(target=log_output, daemon=True)
    log_thread.start()
    
    # Wait for server to be ready
    max_attempts = 30
    for attempt in range(max_attempts):
        try:
            import urllib.request
            urllib.request.urlopen(f"{NODE_SERVER_URL}/api/health", timeout=1)
            logger.info("✅ Node.js server is ready")
            return True
        except Exception:
            if node_process.poll() is not None:
                logger.error("❌ Node.js server exited unexpectedly")
                return False
            time.sleep(0.5)
    
    logger.error("❌ Node.js server failed to start in time")
    return False

def stop_node_server():
    global node_process
    if node_process and node_process.poll() is None:
        logger.info("🛑 Stopping Node.js server...")
        node_process.terminate()
        try:
            node_process.wait(timeout=5)
        except subprocess.TimeoutExpired:
            node_process.kill()
        logger.info("✅ Node.js server stopped")

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup
    if not start_node_server():
        logger.error("Failed to start Node.js server, exiting...")
        sys.exit(1)
    yield
    # Shutdown
    stop_node_server()

# Create FastAPI app
app = FastAPI(
    title="White Dove Wellness API",
    description="Reflexology & Holistic Therapies Website Backend",
    lifespan=lifespan
)

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get('CORS_ORIGINS', '*').split(','),
    allow_methods=["*"],
    allow_headers=["*"],
)

# HTTP client for proxying
http_client = None

async def get_http_client():
    global http_client
    if http_client is None:
        http_client = httpx.AsyncClient(timeout=30.0)
    return http_client

@app.api_route("/api/{path:path}", methods=["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS", "HEAD"])
async def proxy_to_node(path: str, request: Request):
    """Proxy all /api requests to Node.js server"""
    client = await get_http_client()
    
    try:
        # Build target URL
        target_url = f"{NODE_SERVER_URL}/api/{path}"
        
        # Add query params
        if request.query_params:
            target_url += f"?{request.query_params}"
        
        # Forward headers (except host and content-length for body rewrite)
        headers = {}
        for key, value in request.headers.items():
            if key.lower() not in ('host', 'content-length'):
                headers[key] = value
        
        # Get request body
        body = await request.body()
        
        # Make proxied request
        response = await client.request(
            method=request.method,
            url=target_url,
            headers=headers,
            content=body if body else None
        )
        
        # Forward response headers
        response_headers = {}
        for key, value in response.headers.items():
            if key.lower() not in ('content-encoding', 'content-length', 'transfer-encoding'):
                response_headers[key] = value
        
        return Response(
            content=response.content,
            status_code=response.status_code,
            headers=response_headers,
            media_type=response.headers.get('content-type')
        )
        
    except httpx.TimeoutException:
        logger.error(f"Timeout proxying request to {path}")
        return JSONResponse(
            status_code=504,
            content={"success": False, "message": "Request timeout"}
        )
    except httpx.RequestError as e:
        logger.error(f"Proxy error for {path}: {e}")
        return JSONResponse(
            status_code=503,
            content={"success": False, "message": "Backend service unavailable"}
        )
    except Exception as e:
        logger.error(f"Unexpected error proxying {path}: {e}")
        return JSONResponse(
            status_code=500,
            content={"success": False, "message": "Internal server error"}
        )

@app.on_event("shutdown")
async def shutdown_event():
    global http_client
    if http_client:
        await http_client.aclose()
