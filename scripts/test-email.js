const nodemailer = require('nodemailer');

async function testMail() {
  const emailUser = "botmate.in@gmail.com";
  const emailPass = "wcvmiginkraahyxj".replace(/\s+/g, '');
  const target = "kumawatgaurav203@gmail.com";

  console.log('Testing Nodemailer with user:', emailUser);

  try {
    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: emailUser,
        pass: emailPass,
      },
    });

    const info = await transporter.sendMail({
      from: `"ReviewXpress Security" <${emailUser}>`,
      to: target,
      subject: 'ReviewXpress Test OTP',
      text: 'Test OTP is 123456',
    });

    console.log('Email sent successfully!', info.messageId);
  } catch (err) {
    console.error('Nodemailer error:', err);
  }
}

testMail();
