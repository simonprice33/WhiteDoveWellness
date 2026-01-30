"""
White Dove Wellness Backend
This Python wrapper starts the Node.js Express server via subprocess
and provides a FastAPI proxy for the supervisor configuration.
"""

import subprocess
import os
import sys
import signal
import time
import httpx
from fastapi import FastAPI, Request, Response
from fastapi.responses import JSONResponse
from starlette.middleware.cors import CORSMiddleware
import logging

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Start Node.js server as subprocess
node_process = None

def start_node_server():
    global node_process
    logger.info("Starting Node.js Express server...")
    
    node_process = subprocess.Popen(
        ['node', 'server.js'],
        cwd='/app/backend',
        stdout=subprocess.PIPE,
        stderr=subprocess.STDOUT,
        text=True
    )
    
    # Wait for server to start
    time.sleep(2)
    
    if node_process.poll() is None:
        logger.info("Node.js server started successfully")
    else:
        logger.error("Node.js server failed to start")
        # Read output for debugging
        output = node_process.stdout.read()
        logger.error(f"Node output: {output}")

def stop_node_server():
    global node_process
    if node_process:
        logger.info("Stopping Node.js server...")
        node_process.terminate()
        node_process.wait()

# Signal handlers
def handle_signal(signum, frame):
    stop_node_server()
    sys.exit(0)

signal.signal(signal.SIGTERM, handle_signal)
signal.signal(signal.SIGINT, handle_signal)

# Create FastAPI app
app = FastAPI(title="White Dove Wellness Proxy")

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

NODE_SERVER_URL = "http://127.0.0.1:3001"

@app.on_event("startup")
async def startup_event():
    start_node_server()

@app.on_event("shutdown")
async def shutdown_event():
    stop_node_server()

@app.api_route("/api/{path:path}", methods=["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"])
async def proxy_api(path: str, request: Request):
    """Proxy all /api requests to Node.js server"""
    try:
        # Build target URL
        target_url = f"{NODE_SERVER_URL}/api/{path}"
        
        # Get query params
        if request.query_params:
            target_url += f"?{request.query_params}"
        
        # Get headers (exclude host)
        headers = dict(request.headers)
        headers.pop('host', None)
        
        # Get body
        body = await request.body()
        
        async with httpx.AsyncClient(timeout=30.0) as client:
            response = await client.request(
                method=request.method,
                url=target_url,
                headers=headers,
                content=body if body else None
            )
            
            return Response(
                content=response.content,
                status_code=response.status_code,
                headers=dict(response.headers)
            )
    except httpx.RequestError as e:
        logger.error(f"Proxy error: {e}")
        return JSONResponse(
            status_code=503,
            content={"success": False, "message": "Backend service unavailable"}
        )
    except Exception as e:
        logger.error(f"Unexpected proxy error: {e}")
        return JSONResponse(
            status_code=500,
            content={"success": False, "message": str(e)}
        )
