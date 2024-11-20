import smtplib
import sys
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart

# Get email parameters from command line arguments
recipient = sys.argv[1]
subject = sys.argv[2]
body = sys.argv[3]

# Email configuration (use your email service credentials)
sender_email = "gokulgokul10203@gmail.com"
sender_password = "ymza fxgz pgmn edki"  # App-specific password
smtp_server = "smtp.gmail.com"
smtp_port = 587

# Set up the MIME
message = MIMEMultipart()
message["From"] = f"Pulse <{sender_email}>"  # Include display name and email
message["To"] = recipient
message["Subject"] = subject  # Use the provided subject
message.attach(MIMEText(body, "plain"))

# Connect to the email server and send the email
try:
    with smtplib.SMTP(smtp_server, smtp_port) as server:
        server.starttls()  # Secure the connection
        server.login(sender_email, sender_password)
        server.sendmail(sender_email, recipient, message.as_string())
        print("Email sent successfully")
except Exception as e:
    print(f"Failed to send email: {e}")
