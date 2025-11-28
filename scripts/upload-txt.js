// scripts/upload-txt.js
const fs = require('fs');
const FormData = require('form-data');
const axios = require('axios');

async function uploadTXT() {
  try {
    console.log('🔄 Uploading TXT file for debugging...');
    
    const form = new FormData();
    const fileStream = fs.createReadStream('Sample-Academic-Calendar-Document.txt');
    form.append('files', fileStream);
    
    const response = await axios.post('http://localhost:3002/api/upload', form, {
      headers: {
        ...form.getHeaders(),
      },
      timeout: 60000
    });
    
    console.log('✅ Upload successful!');
    console.log('Response:', response.data);
    
  } catch (error) {
    console.error('❌ Upload failed:', error.message);
    if (error.response) {
      console.error('Response data:', error.response.data);
    }
  }
}

uploadTXT();
