import { NextResponse } from 'next/server';
import { Resend } from 'resend';
import { supabaseAdmin } from '@/lib/supabase';

// POST manual — para reenviar e-mail pelo dashboard
export async function POST(req: Request) {
  const resend = new Resend(process.env.RESEND_API_KEY);
  try {
    const { leadId } = await req.json();

    if (!leadId) {
      return NextResponse.json({ error: 'leadId obrigatório' }, { status: 400 });
    }

    const { data: lead, error } = await supabaseAdmin
      .from('sticker_leads')
      .select('*')
      .eq('id', leadId)
      .single();

    if (error || !lead) {
      return NextResponse.json({ error: 'Lead não encontrado' }, { status: 404 });
    }

    if (!lead.email) {
      return NextResponse.json({ error: 'Lead sem e-mail cadastrado' }, { status: 400 });
    }

    if (!lead.image_url) {
      return NextResponse.json({ error: 'Imagem ainda não foi gerada para este lead' }, { status: 400 });
    }

    const nomeDisplay = lead.nome ? lead.nome.toUpperCase() : 'CRAQUE';

    const { error: resendError } = await resend.emails.send({
      from: process.env.RESEND_FROM_EMAIL || 'Figurinha da Copa <noreply@figurinhapersonalizada.shop>',
      to: lead.email,
      subject: `⚽ Sua Figurinha da Copa 2026 está pronta, ${lead.nome || 'Craque'}!`,
      html: `
<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8"/>
  <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
</head>
<body style="margin:0;padding:0;background:#f5f5f5;font-family:'Helvetica Neue',Helvetica,Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f5f5f5;padding:30px 0;">
    <tr>
      <td align="center">
        <table width="480" cellpadding="0" cellspacing="0" style="background:#fff;border-radius:20px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.10);">
          <tr>
            <td style="background:linear-gradient(135deg,#1a237e 0%,#283593 100%);padding:32px 24px;text-align:center;">
              <p style="margin:0;color:#FFD600;font-size:13px;font-weight:700;letter-spacing:2px;text-transform:uppercase;">⚽ Copa do Mundo 2026</p>
              <h1 style="margin:12px 0 0;color:#fff;font-size:28px;font-weight:900;line-height:1.2;">
                Sua Figurinha está pronta,<br/>${nomeDisplay}!
              </h1>
            </td>
          </tr>
          <tr>
            <td style="padding:32px 24px;text-align:center;background:#FFF9C4;">
              <img
                src="${lead.image_url}"
                alt="Figurinha Personalizada"
                style="max-width:280px;width:100%;border-radius:16px;box-shadow:0 8px 32px rgba(0,0,0,0.20);border:4px solid #FFD600;"
              />
            </td>
          </tr>
          <tr>
            <td style="padding:24px;text-align:center;">
              <a href="${lead.image_url}" target="_blank" style="display:inline-block;background:linear-gradient(135deg,#1a237e,#283593);color:#FFD600;text-decoration:none;font-size:15px;font-weight:800;padding:16px 36px;border-radius:50px;">
                ⬇️ BAIXAR FIGURINHA
              </a>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
      `.trim(),
    });

    if (resendError) {
      return NextResponse.json({ error: JSON.stringify(resendError) }, { status: 500 });
    }

    // Atualiza status
    await supabaseAdmin
      .from('sticker_leads')
      .update({ status: 'sent', sent_at: new Date().toISOString() })
      .eq('id', leadId);

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('[sticker/send-email] Erro:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
