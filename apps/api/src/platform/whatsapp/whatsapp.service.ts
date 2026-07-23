import { Injectable, Logger } from '@nestjs/common';
import FormData from 'form-data';
// Fix for Node's fetch since FormData comes from form-data package in Node < 18 or requires specific handling
// We'll use axios or native fetch. Node 18 fetch supports FormData, but form-data package is specifically for old node or axios.
// Let's just use axios for safety, or native fetch if we can.
import axios from 'axios';

@Injectable()
export class WhatsappService {
  private logger = new Logger(WhatsappService.name);

  async sendDocument(phoneNumber: string, documentBuffer: Buffer, filename: string, caption: string) {
    const token = process.env.WHATSAPP_API_TOKEN;
    const phoneId = process.env.WHATSAPP_PHONE_NUMBER_ID;
    const version = 'v17.0'; 

    if (!token || !phoneId) {
      this.logger.warn('No WHATSAPP_API_TOKEN or WHATSAPP_PHONE_NUMBER_ID found. Simulating WhatsApp send.');
      this.logger.log(`WhatsApp to ${phoneNumber} | Caption: ${caption} | Attachment Size: ${documentBuffer.length}`);
      return true;
    }

    try {
      // Step 1: Upload the PDF buffer to Meta's Media endpoint
      const form = new FormData();
      form.append('file', documentBuffer, { filename, contentType: 'application/pdf' });
      form.append('type', 'document');
      form.append('messaging_product', 'whatsapp');

      const mediaRes = await axios.post(`https://graph.facebook.com/${version}/${phoneId}/media`, form, {
        headers: {
          'Authorization': `Bearer ${token}`,
          ...form.getHeaders()
        }
      });
      const mediaId = mediaRes.data.id;

      // Step 2: Send the Document Message using the generated media_id
      await axios.post(`https://graph.facebook.com/${version}/${phoneId}/messages`, {
        messaging_product: 'whatsapp',
        to: phoneNumber.replace(/\\D/g, ''), 
        type: 'document',
        document: {
          id: mediaId,
          caption: caption,
          filename: filename
        }
      }, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      return true;
    } catch (err: any) {
      this.logger.error(`Failed to send WhatsApp message: ${err.response?.data?.error?.message || err.message}`);
      throw err;
    }
  }
}
