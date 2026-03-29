const express = require('express');
const Anthropic = require('@anthropic-ai/sdk');
const { z } = require('zod');
const { optionalAuth } = require('../middleware/auth');
const logger = require('../logger');
const db = require('../database');

const router = express.Router();

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

const SYSTEM_PROMPT = `Bạn là trợ lý AI của OCEAN AI CRM — hệ thống quản lý tư vấn đầu tư FDI vào Việt Nam và đăng ký mỹ phẩm/thực phẩm nhập khẩu.

Bạn có thể hỗ trợ chuyên sâu về:
1. **Quy trình đầu tư FDI vào Việt Nam**: IRC (Giấy chứng nhận đăng ký đầu tư), ERC (Giấy chứng nhận đăng ký doanh nghiệp), giấy phép con theo ngành
2. **Thủ tục nhập khẩu mỹ phẩm**: công bố lưu hành, kiểm tra nhà nước, danh mục cấm/hạn chế
3. **Quy định thực phẩm**: công bố chất lượng ATTP, kiểm tra nhà nước, nhãn mác
4. **Giấy phép lao động & thẻ tạm trú**: Work Permit, TRC cho người nước ngoài
5. **Quy định thành phần mỹ phẩm**: CosIng EU, quy định Nhật Bản, Hàn Quốc, Trung Quốc, Mỹ, Việt Nam
6. **Quản lý hồ sơ & hợp đồng**: tư vấn quy trình, thời hạn, checklist tài liệu

Phong cách trả lời:
- Chuyên nghiệp, chính xác, thực tế
- Sử dụng tiếng Việt hoặc tiếng Anh tùy theo câu hỏi
- Trả lời có cấu trúc rõ ràng với các bước hoặc gạch đầu dòng khi cần
- Khi không chắc chắn, hãy thành thật và khuyến nghị tham khảo văn bản pháp lý chính thức
- Nêu rõ văn bản pháp lý liên quan (Luật, Nghị định, Thông tư) khi trả lời về quy định`;

const ChatSchema = z.object({
  message: z.string().min(1).max(4000),
  history: z.array(z.object({
    role: z.enum(['user', 'assistant']),
    content: z.string(),
  })).max(20).optional().default([]),
  context: z.enum(['crm', 'cosing', 'regulations', 'general']).optional().default('general'),
});

// ── POST /api/ai/chat ─────────────────────────────────────────
router.post('/chat', optionalAuth, async (req, res, next) => {
  try {
    if (!process.env.ANTHROPIC_API_KEY) {
      return res.status(503).json({
        error: 'AI chưa được cấu hình. Vui lòng thêm ANTHROPIC_API_KEY vào biến môi trường.',
      });
    }

    const body = ChatSchema.parse(req.body);

    // Build messages array with conversation history
    const messages = [
      ...body.history.map(h => ({ role: h.role, content: h.content })),
      { role: 'user', content: body.message },
    ];

    const response = await client.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 2048,
      system: SYSTEM_PROMPT,
      messages,
    });

    const reply = response.content[0]?.text || '';
    logger.debug(`AI chat: user="${body.message.slice(0, 80)}" → ${reply.length} chars`);

    res.json({
      reply,
      model: response.model,
      usage: response.usage,
    });
  } catch (err) {
    if (err instanceof z.ZodError) {
      return res.status(400).json({ error: 'Dữ liệu không hợp lệ', details: err.errors });
    }
    if (err instanceof Anthropic.APIError) {
      logger.error(`Anthropic API error: ${err.status} ${err.message}`);
      return res.status(502).json({ error: `Lỗi AI: ${err.message}` });
    }
    next(err);
  }
});

// ── POST /api/ai/chat/stream ──────────────────────────────────
router.post('/chat/stream', optionalAuth, async (req, res, next) => {
  try {
    if (!process.env.ANTHROPIC_API_KEY) {
      return res.status(503).json({
        error: 'AI chưa được cấu hình. Vui lòng thêm ANTHROPIC_API_KEY vào biến môi trường.',
      });
    }

    const body = ChatSchema.parse(req.body);

    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');

    const messages = [
      ...body.history.map(h => ({ role: h.role, content: h.content })),
      { role: 'user', content: body.message },
    ];

    const stream = await client.messages.stream({
      model: 'claude-sonnet-4-6',
      max_tokens: 2048,
      system: SYSTEM_PROMPT,
      messages,
    });

    for await (const chunk of stream) {
      if (chunk.type === 'content_block_delta' && chunk.delta?.type === 'text_delta') {
        res.write(`data: ${JSON.stringify({ text: chunk.delta.text })}\n\n`);
      }
    }

    const final = await stream.finalMessage();
    res.write(`data: ${JSON.stringify({ done: true, usage: final.usage })}\n\n`);
    res.end();
  } catch (err) {
    if (err instanceof z.ZodError) {
      res.write(`data: ${JSON.stringify({ error: 'Dữ liệu không hợp lệ' })}\n\n`);
      return res.end();
    }
    if (err instanceof Anthropic.APIError) {
      res.write(`data: ${JSON.stringify({ error: err.message })}\n\n`);
      return res.end();
    }
    next(err);
  }
});

// ── POST /api/ai/ingredient-check ────────────────────────────
// AI-powered ingredient safety assessment using CosIng data
router.post('/ingredient-check', optionalAuth, async (req, res, next) => {
  try {
    if (!process.env.ANTHROPIC_API_KEY) {
      return res.status(503).json({ error: 'AI chưa được cấu hình.' });
    }

    const { inci_name, target_countries } = req.body;
    if (!inci_name) return res.status(400).json({ error: 'Thiếu tên INCI' });

    // Fetch ingredient data from DB
    const ingredient = db.prepare(
      "SELECT * FROM cosing_ingredients WHERE LOWER(TRIM(inci_name)) = LOWER(TRIM(?))"
    ).get(inci_name);

    const countryRegs = db.prepare(
      "SELECT * FROM country_regs WHERE LOWER(TRIM(inci_name)) = LOWER(TRIM(?)) ORDER BY country"
    ).all(inci_name);

    const context = ingredient
      ? `Dữ liệu CosIng EU: ${JSON.stringify(ingredient)}\nQuy định quốc gia: ${JSON.stringify(countryRegs)}`
      : `Không tìm thấy ${inci_name} trong CosIng DB. Các quy định: ${JSON.stringify(countryRegs)}`;

    const prompt = `Đánh giá an toàn cho thành phần mỹ phẩm: ${inci_name}
${target_countries ? `Thị trường mục tiêu: ${target_countries.join(', ')}` : ''}

${context}

Hãy đưa ra:
1. Tổng quan về thành phần này
2. Mức độ an toàn (EU CosIng)
3. Tình trạng pháp lý tại các thị trường liên quan
4. Giới hạn nồng độ (nếu có)
5. Khuyến nghị cho việc sử dụng trong sản phẩm nhập khẩu vào Việt Nam`;

    const response = await client.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 1500,
      system: SYSTEM_PROMPT,
      messages: [{ role: 'user', content: prompt }],
    });

    res.json({
      inci_name,
      db_data: { cosing: ingredient, country_regs: countryRegs },
      ai_assessment: response.content[0]?.text || '',
    });
  } catch (err) {
    next(err);
  }
});

// ── GET /api/ai/status ────────────────────────────────────────
router.get('/status', (req, res) => {
  res.json({
    configured: !!process.env.ANTHROPIC_API_KEY,
    model: 'claude-sonnet-4-6',
    features: ['chat', 'streaming', 'ingredient-check'],
  });
});

module.exports = router;
