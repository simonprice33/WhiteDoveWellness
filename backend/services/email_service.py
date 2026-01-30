import os
import logging
import aiosmtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
import httpx

logger = logging.getLogger(__name__)


class EmailService:
    """Email service supporting both GoDaddy SMTP and Microsoft Graph API"""
    
    def __init__(self):
        self.provider = os.environ.get('EMAIL_PROVIDER', 'none')  # 'godaddy', 'microsoft', or 'none'
        
        # GoDaddy SMTP settings
        self.smtp_host = os.environ.get('SMTP_HOST', 'smtpout.secureserver.net')
        self.smtp_port = int(os.environ.get('SMTP_PORT', '465'))
        self.smtp_user = os.environ.get('SMTP_USER', '')
        self.smtp_password = os.environ.get('SMTP_PASSWORD', '')
        self.smtp_from = os.environ.get('SMTP_FROM', '')
        
        # Microsoft Graph settings
        self.ms_client_id = os.environ.get('MS_CLIENT_ID', '')
        self.ms_client_secret = os.environ.get('MS_CLIENT_SECRET', '')
        self.ms_tenant_id = os.environ.get('MS_TENANT_ID', '')
        self.ms_user_id = os.environ.get('MS_USER_ID', '')  # User email for sending
        
        # Recipient email for contact forms
        self.contact_recipient = os.environ.get('CONTACT_EMAIL', '')
    
    async def send_email(self, to: str, subject: str, body: str, html_body: str = None) -> bool:
        """Send email using configured provider"""
        if self.provider == 'godaddy':
            return await self._send_via_godaddy(to, subject, body, html_body)
        elif self.provider == 'microsoft':
            return await self._send_via_microsoft(to, subject, body, html_body)
        else:
            logger.warning("No email provider configured. Email not sent.")
            return False
    
    async def _send_via_godaddy(self, to: str, subject: str, body: str, html_body: str = None) -> bool:
        """Send email via GoDaddy SMTP"""
        try:
            message = MIMEMultipart("alternative")
            message["From"] = self.smtp_from
            message["To"] = to
            message["Subject"] = subject
            
            message.attach(MIMEText(body, "plain"))
            if html_body:
                message.attach(MIMEText(html_body, "html"))
            
            await aiosmtplib.send(
                message,
                hostname=self.smtp_host,
                port=self.smtp_port,
                username=self.smtp_user,
                password=self.smtp_password,
                use_tls=True
            )
            logger.info(f"Email sent via GoDaddy to {to}")
            return True
        except Exception as e:
            logger.error(f"GoDaddy SMTP error: {e}")
            return False
    
    async def _get_microsoft_token(self) -> str:
        """Get Microsoft Graph API access token"""
        url = f"https://login.microsoftonline.com/{self.ms_tenant_id}/oauth2/v2.0/token"
        data = {
            "client_id": self.ms_client_id,
            "client_secret": self.ms_client_secret,
            "scope": "https://graph.microsoft.com/.default",
            "grant_type": "client_credentials"
        }
        
        async with httpx.AsyncClient() as client:
            response = await client.post(url, data=data)
            response.raise_for_status()
            return response.json()["access_token"]
    
    async def _send_via_microsoft(self, to: str, subject: str, body: str, html_body: str = None) -> bool:
        """Send email via Microsoft Graph API"""
        try:
            token = await self._get_microsoft_token()
            url = f"https://graph.microsoft.com/v1.0/users/{self.ms_user_id}/sendMail"
            
            email_data = {
                "message": {
                    "subject": subject,
                    "body": {
                        "contentType": "HTML" if html_body else "Text",
                        "content": html_body or body
                    },
                    "toRecipients": [
                        {"emailAddress": {"address": to}}
                    ]
                },
                "saveToSentItems": "true"
            }
            
            async with httpx.AsyncClient() as client:
                response = await client.post(
                    url,
                    json=email_data,
                    headers={"Authorization": f"Bearer {token}", "Content-Type": "application/json"}
                )
                response.raise_for_status()
            
            logger.info(f"Email sent via Microsoft Graph to {to}")
            return True
        except Exception as e:
            logger.error(f"Microsoft Graph error: {e}")
            return False
    
    async def send_contact_notification(self, name: str, email: str, phone: str, message: str) -> bool:
        """Send contact form notification to business owner"""
        if not self.contact_recipient:
            logger.warning("No contact recipient configured")
            return False
        
        subject = f"New Contact Form Submission from {name}"
        body = f"""
New contact form submission:

Name: {name}
Email: {email}
Phone: {phone or 'Not provided'}

Message:
{message}
        """
        
        html_body = f"""
<!DOCTYPE html>
<html>
<head>
    <style>
        body {{ font-family: 'Manrope', sans-serif; color: #374151; }}
        .container {{ max-width: 600px; margin: 0 auto; padding: 20px; }}
        .header {{ background: linear-gradient(135deg, #9F87C4 0%, #A7D7C5 100%); padding: 20px; border-radius: 8px 8px 0 0; }}
        .header h1 {{ color: white; margin: 0; }}
        .content {{ background: #f9fafb; padding: 20px; border-radius: 0 0 8px 8px; }}
        .field {{ margin-bottom: 15px; }}
        .label {{ font-weight: 600; color: #6b7280; }}
        .value {{ margin-top: 5px; }}
        .message {{ background: white; padding: 15px; border-radius: 8px; border: 1px solid #e5e7eb; }}
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>New Contact Form Submission</h1>
        </div>
        <div class="content">
            <div class="field">
                <div class="label">Name</div>
                <div class="value">{name}</div>
            </div>
            <div class="field">
                <div class="label">Email</div>
                <div class="value"><a href="mailto:{email}">{email}</a></div>
            </div>
            <div class="field">
                <div class="label">Phone</div>
                <div class="value">{phone or 'Not provided'}</div>
            </div>
            <div class="field">
                <div class="label">Message</div>
                <div class="message">{message}</div>
            </div>
        </div>
    </div>
</body>
</html>
        """
        
        return await self.send_email(self.contact_recipient, subject, body, html_body)


# Global email service instance
email_service = EmailService()
