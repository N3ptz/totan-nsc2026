import { All, Controller, Req, Res } from '@nestjs/common';
import { Request, Response } from 'express';
import axios from 'axios';

// Route map: prefix → service URL
const ROUTES: Record<string, string> = {
  '/auth':        process.env.AUTH_SERVICE_URL    ?? 'http://localhost:3001',
  '/children':    process.env.PATIENT_SERVICE_URL ?? 'http://localhost:3002',
  '/assessments': process.env.PATIENT_SERVICE_URL ?? 'http://localhost:3002',
  '/recommendations': process.env.PATIENT_SERVICE_URL ?? 'http://localhost:3002',
  '/ai':          process.env.AI_SERVICE_URL      ?? 'http://localhost:8000',
};

@Controller()
export class ProxyController {
  // รับทุก method (GET, POST, PATCH, DELETE) และทุก path
  @All('*')
  async proxy(@Req() req: Request, @Res() res: Response) {
    // หา service ที่ตรงกับ path
    const prefix = Object.keys(ROUTES).find((r) => req.path.startsWith(r));

    if (!prefix) {
      return res.status(404).json({ message: `ไม่พบ route: ${req.path}` });
    }

    const targetUrl = `${ROUTES[prefix]}${req.path}`;

    try {
      const isMultipart = (req.headers['content-type'] ?? '').includes('multipart/form-data');

      // JSON body ถูก parse แล้ว re-serialize ใหม่ → byte length อาจไม่เท่าเดิม
      // ต้องทิ้ง content-length เดิม ให้ axios คำนวณใหม่เอง (ยกเว้น multipart ที่ pipe stream ตรงๆ)
      const forwardHeaders: Record<string, any> = { ...req.headers };
      delete forwardHeaders.host;
      if (!isMultipart) delete forwardHeaders['content-length'];

      const response = await axios({
        method: req.method as any,
        url: targetUrl,
        // multipart: pipe raw stream โดยตรง (req.body จะว่างเปล่าสำหรับ file upload)
        data: isMultipart ? req : req.body,
        headers: forwardHeaders,
        params: req.query,
        maxBodyLength: 25 * 1024 * 1024,    // 25 MB
        maxContentLength: 25 * 1024 * 1024,
      });

      return res.status(response.status).json(response.data);
    } catch (err: any) {
      const status = err.response?.status ?? 500;
      const data = err.response?.data ?? { message: 'Internal server error' };
      return res.status(status).json(data);
    }
  }
}
