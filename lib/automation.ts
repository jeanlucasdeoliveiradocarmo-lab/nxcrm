import { timingSafeEqual } from "node:crypto";

export function authorized(
  request: Request,
  secret: string | undefined,
) {
  if (!secret) return false;

  const actual = Buffer.from(
    request.headers.get("authorization") || "",
  );

  const expected = Buffer.from(`Bearer ${secret}`);

  return (
    actual.length === expected.length &&
    timingSafeEqual(actual, expected)
  );
}

export function phoneNumber(value: string) {
  const digits = value.replace(/\D/g, "");

  // Números brasileiros informados somente com DDD recebem o DDI 55.
  const phone =
    digits.length === 10 || digits.length === 11
      ? `55${digits}`
      : digits;

  if (!/^\d{12,15}$/.test(phone)) {
    throw new Error(
      "Telefone inválido. Use DDI + DDD + número.",
    );
  }

  return phone;
}

function env(name: string) {
  const value = process.env[name];

  if (!value) {
    throw new Error(`Configuração ausente: ${name}`);
  }

  return value;
}

export async function sendMessage(
  tipo: string,
  lead: {
    email?: string;
    telefone?: string;
  },
  text: string,
  key: string,
  subject = "Alvenn — contato agendado",
) {
  let url: string;

  let headers: Record<string, string> = {
    "Content-Type": "application/json",
  };

  let body: Record<string, unknown>;

  if (tipo === "email") {
    if (
      !lead.email ||
      !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(lead.email)
    ) {
      throw new Error("E-mail do lead inválido.");
    }

    url = "https://api.resend.com/emails";

    headers = {
      ...headers,
      Authorization: `Bearer ${env("RESEND_API_KEY")}`,
      "Idempotency-Key": key,
    };

    body = {
      from: env("RESEND_FROM_EMAIL"),
      to: [lead.email],
      subject,
      text,
    };
  } else if (tipo === "whatsapp") {
    const instanceId = encodeURIComponent(
      env("ZAPI_INSTANCE_ID"),
    );

    const instanceToken = encodeURIComponent(
      env("ZAPI_INSTANCE_TOKEN"),
    );

    url =
      `https://api.z-api.io/instances/${instanceId}` +
      `/token/${instanceToken}/send-text`;

    headers["Client-Token"] = env("ZAPI_CLIENT_TOKEN");

    body = {
      phone: phoneNumber(lead.telefone || ""),
      message: text,
    };
  } else {
    throw new Error("Tipo de tarefa inválido.");
  }

  let response: Response;

  try {
    response = await fetch(url, {
      method: "POST",
      headers,
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(15000),
    });
  } catch {
    throw new Error(
      "Resposta do provedor inconclusiva. Confira o envio antes de reagendar.",
    );
  }

  if (!response.ok) {
    throw new Error(
      `Provedor recusou o envio (HTTP ${response.status}).`,
    );
  }

  const result = await response.json();

  const id =
    tipo === "email"
      ? result.id
      : result.messageId || result.zaapId;

  if (result.error || !id) {
    throw new Error(
      "Provedor não confirmou o envio. Confira antes de reagendar.",
    );
  }

  return String(id);
}
