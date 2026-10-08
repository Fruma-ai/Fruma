"use server";

import { cookies } from "next/headers";
import { sessionFounder } from "../../../lib/gate";
import { isMissingConfigurationException } from "../../../lib/fruma/persist/configuration";
import {
  executeAppendOnlySourcingMessage,
  parseSourcingPayload,
  resolveSourcingActor,
  runSourcingInsert,
} from "../../../lib/fruma/persist/sourcing-message";

const SOURCING_MESSAGE_INSERT = `
INSERT INTO fruma_sourcing_messages (
  deposit_id,
  sender_handle,
  is_identity_disclosed,
  encrypted_payload,
  sent_at
) VALUES (
  $1,
  $2,
  $3,
  $4,
  NOW()::timestamptz
)
RETURNING message_id, sent_at
`.trim();

export async function sendSourcingMessage(payload: {
  deposit_id: string;
  encrypted_payload: string;
  is_identity_disclosed: boolean;
}) {
  const jar = await cookies();
  const actor = await resolveSourcingActor(
    (cookie) => sessionFounder(cookie),
    (name) => jar.get(name)?.value,
  );
  if (!actor) return { ok: false as const, error: "unauthorized" };

  const parsed = parseSourcingPayload(payload);
  if (!parsed.ok) return parsed;

  try {
    const written = await executeAppendOnlySourcingMessage(
      runSourcingInsert,
      actor.namespace,
      SOURCING_MESSAGE_INSERT,
      {
        depositId: parsed.value.deposit_id,
        senderHandle: actor.founder,
        isIdentityDisclosed: parsed.value.is_identity_disclosed,
        encryptedPayload: parsed.value.encrypted_payload,
      },
    );
    return { ok: true as const, messageId: written.messageId, sentAt: written.sentAt };
  } catch (error) {
    if (isMissingConfigurationException(error)) {
      return { ok: false as const, error: error.message };
    }
    console.error("[sourcing] append-only insert failed", error);
    return { ok: false as const, error: "message_insert_failed" };
  }
}
