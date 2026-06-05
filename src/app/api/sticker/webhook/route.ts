import { NextResponse } from 'next/server';
import { Resend } from 'resend';
import { supabaseAdmin } from '@/lib/supabase';

export async function POST(req: Request) {
  const resend = new Resend(process.env.RESEND_API_KEY);
  try {
    const body = await req.json();

    // Verifica assinatura da Cakto (opcional mas recomendado)
    // A Cakto envia um header de autenticação
    // const caktoSecret = process.env.CAKTO_WEBHOOK_SECRET;
    // Implemente verificação HMAC aqui se necessário

    console.log('[sticker/webhook] Cakto webhook recebido:', JSON.stringify(body).substring(0, 500));

    // Payload da Cakto — estrutura típica:
    // body.event = 'purchase.approved'
    // body.data.customer.email
    // body.data.customer.name
    const event = body.event || body.type || body.status;
    const customerEmail =
      body?.data?.customer?.email ||
      body?.customer?.email ||
      body?.email ||
      null;

    if (!customerEmail) {
      console.warn('[sticker/webhook] E-mail do cliente não encontrado no payload');
      return NextResponse.json({ error: 'E-mail não encontrado' }, { status: 400 });
    }

    // Considera aprovado qualquer evento que contenha 'approved' ou 'paid' ou 'complete'
    const isApproved =
      typeof event === 'string' &&
      (event.toLowerCase().includes('approved') ||
        event.toLowerCase().includes('paid') ||
        event.toLowerCase().includes('complete') ||
        event.toLowerCase().includes('aprovad'));

    if (!isApproved) {
      console.log(`[sticker/webhook] Evento ignorado: ${event}`);
      return NextResponse.json({ received: true, ignored: true });
    }

    // Busca o lead mais recente com esse e-mail que ainda não foi enviado
    const { data: lead, error: findError } = await supabaseAdmin
      .from('sticker_leads')
      .select('*')
      .eq('email', customerEmail.toLowerCase().trim())
      .in('status', ['pending', 'paid'])
      .not('image_url', 'is', null)
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    if (findError || !lead) {
      console.warn(`[sticker/webhook] Lead não encontrado para o e-mail: ${customerEmail}`);
      // Retorna 200 para a Cakto não retentar
      return NextResponse.json({ received: true, warning: 'Lead não encontrado' });
    }

    // Atualiza status para 'paid'
    await supabaseAdmin
      .from('sticker_leads')
      .update({ status: 'paid', paid_at: new Date().toISOString() })
      .eq('id', lead.id);

    // Envia e-mail com a figurinha
    const emailResult = await sendStickerEmail(lead, resend);

    if (emailResult.success) {
      await supabaseAdmin
        .from('sticker_leads')
        .update({ status: 'sent', sent_at: new Date().toISOString() })
        .eq('id', lead.id);

      console.log(`[sticker/webhook] Figurinha enviada com sucesso para ${customerEmail}`);
    } else {
      console.error(`[sticker/webhook] Falha ao enviar e-mail para ${customerEmail}:`, emailResult.error);
    }

    return NextResponse.json({ received: true, sent: emailResult.success });
  } catch (error: any) {
    console.error('[sticker/webhook] Erro geral:', error);
    // Retorna 200 para a Cakto não ficar retentando em loop
    return NextResponse.json({ received: true, error: error.message }, { status: 200 });
  }
}

async function sendStickerEmail(lead: any, resend: Resend): Promise<{ success: boolean; error?: string }> {
  try {
    const nomeDisplay = lead.nome ? lead.nome.toUpperCase() : 'CRAQUE';

    const { error } = await resend.emails.send({
      from: process.env.RESEND_FROM_EMAIL || 'Figurinha da Copa <noreply@figurinhapersonalizada.shop>',
      to: lead.email,
      subject: `⚽ Sua Figurinha da Copa 2026 está pronta, ${lead.nome || 'Craque'}!`,
      html: `
<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8"/>
  <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
  <title>Sua Figurinha da Copa 2026</title>
</head>
<body style="margin:0;padding:0;background:#f5f5f5;font-family:'Helvetica Neue',Helvetica,Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f5f5f5;padding:30px 0;">
    <tr>
      <td align="center">
        <table width="480" cellpadding="0" cellspacing="0" style="background:#fff;border-radius:20px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.10);">
          <!-- Header -->
          <tr>
            <td style="background:linear-gradient(135deg,#1a237e 0%,#283593 100%);padding:32px 24px;text-align:center;">
              <p style="margin:0;color:#FFD600;font-size:13px;font-weight:700;letter-spacing:2px;text-transform:uppercase;">⚽ Copa do Mundo 2026</p>
              <h1 style="margin:12px 0 0;color:#fff;font-size:28px;font-weight:900;line-height:1.2;">
                Sua Figurinha está pronta,<br/>${nomeDisplay}!
              </h1>
            </td>
          </tr>

          <!-- Sticker Image -->
          <tr>
            <td style="padding:32px 24px;text-align:center;background:#FFF9C4;">
              <p style="margin:0 0 16px;color:#1a237e;font-size:14px;font-weight:700;text-transform:uppercase;letter-spacing:1px;">📸 Sua figurinha personalizada</p>
              <img
                src="${lead.image_url}"
                alt="Sua Figurinha Personalizada da Copa 2026"
                style="max-width:280px;width:100%;border-radius:16px;box-shadow:0 8px 32px rgba(0,0,0,0.20);border:4px solid #FFD600;"
              />
              <p style="margin:16px 0 0;color:#555;font-size:13px;">
                Clique na imagem com o botão direito para salvar no seu dispositivo.
              </p>
            </td>
          </tr>

          <!-- Dados da Figurinha -->
          <tr>
            <td style="padding:24px;background:#fff;">
              <table width="100%" cellpadding="0" cellspacing="0" style="background:#f8f9ff;border-radius:12px;overflow:hidden;border:1px solid #e8eaf6;">
                <tr>
                  <td style="padding:16px 20px;border-bottom:1px solid #e8eaf6;">
                    <p style="margin:0;color:#7986cb;font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:1px;">Nome</p>
                    <p style="margin:4px 0 0;color:#1a237e;font-size:16px;font-weight:700;">${lead.nome || '—'}</p>
                  </td>
                </tr>
                ${lead.clube ? `<tr>
                  <td style="padding:16px 20px;border-bottom:1px solid #e8eaf6;">
                    <p style="margin:0;color:#7986cb;font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:1px;">Clube</p>
                    <p style="margin:4px 0 0;color:#1a237e;font-size:16px;font-weight:700;">${lead.clube}</p>
                  </td>
                </tr>` : ''}
                ${lead.peso && lead.altura ? `<tr>
                  <td style="padding:16px 20px;">
                    <p style="margin:0;color:#7986cb;font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:1px;">Dados</p>
                    <p style="margin:4px 0 0;color:#1a237e;font-size:15px;font-weight:600;">${lead.peso}kg · ${lead.altura}cm</p>
                  </td>
                </tr>` : ''}
              </table>
            </td>
          </tr>

          <!-- CTA -->
          <tr>
            <td style="padding:0 24px 32px;text-align:center;">
              <p style="margin:0 0 20px;color:#333;font-size:14px;line-height:1.6;">
                Sua figurinha foi gerada com sucesso! 🎉<br/>
                Guarde essa imagem com carinho — ela é única e exclusiva.
              </p>
              <a href="${lead.image_url}" target="_blank" style="display:inline-block;background:linear-gradient(135deg,#1a237e,#283593);color:#FFD600;text-decoration:none;font-size:15px;font-weight:800;padding:16px 36px;border-radius:50px;letter-spacing:0.5px;">
                ⬇️ BAIXAR FIGURINHA
              </a>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background:#1a237e;padding:20px 24px;text-align:center;">
              <p style="margin:0;color:rgba(255,255,255,0.6);font-size:12px;">
                Figurinha Personalizada da Copa 2026 · Entrega digital
              </p>
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

    if (error) {
      return { success: false, error: JSON.stringify(error) };
    }

    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}
