    // verifyMailTemplate.js
 
const verifyMailTemplate = (OTP) => {
    return `
        <!DOCTYPE html>
        <html lang="en">
        <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <style>
                body {
                    margin: 0;
                    padding: 0;
                    font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
                    background-color: #f4f6f9;
                    display: flex;
                    justify-content: center;
                    align-items: center;
                    height: 100vh;
                }
                .container {
                    background: #ffffff;
                    padding: 30px 25px;
                    border-radius: 12px;
                    box-shadow: 0 10px 25px rgba(0, 0, 0, 0.1);
                    text-align: center;
                    max-width: 420px;
                    width: 100%;
                }
                .logo {
                    max-width: 100px;
                    margin-bottom: 20px;
                }
                h1 {
                    font-size: 26px;
                    color: #222;
                    margin-bottom: 12px;
                }
                p {
                    font-size: 16px;
                    color: #555;
                    margin-bottom: 25px;
                }
                .otp {
                    font-size: 30px;
                    letter-spacing: 4px;
                    font-weight: bold;
                    color: #ffffff;
                    background: #28a745;
                    padding: 12px 20px;
                    border-radius: 8px;
                    display: inline-block;
                    box-shadow: 0 4px 8px rgba(0, 0, 0, 0.15);
                }
                .footer {
                    margin-top: 30px;
                    font-size: 12px;
                    color: #999;
                }
            </style>
        </head>
        <body>
            <div class="container">
                <img src="https://kifaytidata2024.s3.ap-south-1.amazonaws.com/kifayti_logo.png" alt="Kifayti Health - Teleconsultation Logo" class="logo">
                <h1>Kifayti Health - Teleconsultation</h1>
                <p>Please use the following OTP to verify your email address:</p>
                <div class="otp">${OTP}</div>
                <div class="footer">This OTP will expire in 10 minutes. Do not share it with anyone.</div>
            </div>
        </body>
        </html>
    `;
};

module.exports = verifyMailTemplate;
