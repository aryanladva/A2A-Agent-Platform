import crypto from 'crypto';
import { AgentCard } from '@a2a/shared-types';

export function signAgentCard(card: Omit<AgentCard, 'signature'>, signingKey: string): AgentCard {
  const contentToSign = JSON.stringify({
    name: card.name,
    version: card.version,
    url: card.url,
    skills: card.skills,
  });

  const signatureValue = crypto
    .createHmac('sha256', signingKey)
    .update(contentToSign)
    .digest('base64');

  return {
    ...card,
    signature: {
      alg: 'HS256',
      value: signatureValue,
    },
  };
}

export function verifyAgentCardSignature(card: AgentCard, signingKey: string): boolean {
  if (!card.signature || !card.signature.value) {
    return false;
  }

  const { signature, ...cardWithoutSignature } = card;
  const expectedSignedCard = signAgentCard(cardWithoutSignature, signingKey);

  return signature.value === expectedSignedCard.signature?.value;
}
