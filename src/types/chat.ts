// ─── Chat / Negotiation shared TypeScript types ───────────────────────────────

export type MessageType = 'TEXT' | 'SYSTEM' | 'NEGOTIATION_QUOTE';
export type QuoteStatus  = 'PENDING' | 'ACCEPTED' | 'REJECTED' | 'EXPIRED';
export type ConversationType = 'GENERAL' | 'NEGOTIATION' | 'AI';

export interface QuoteData {
  messageId:   string;
  productId:   string;
  productName: string;
  quantity:    number;
  price:       number;
  unit:        string;
  status:      QuoteStatus;
}

export interface Message {
  id:           string;
  sender_id:    string;
  content:      string;
  created_at:   string;
  message_type: MessageType;
  quote?:       QuoteData | null;
}

export interface ConversationPartner {
  id:       string;
  full_name: string;
  avatar?:  string;
  profile?: { store_name?: string };
}

export interface Conversation {
  id:                 string;
  partner:            ConversationPartner;
  lastMessage?: {
    content:    string;
    created_at: string;
    sender_id:  string;
  };
  conversation_type?:  ConversationType;
  negotiation_status?: string;
  /** Sản phẩm đang được đàm phán (nếu là NEGOTIATION conversation) */
  product?: {
    id:    string;
    name:  string;
    unit?: string;
  };
}

export interface CheckoutData {
  productId:       string;
  productName:     string;
  quantity:        number;
  negotiatedPrice: number;
  unit:            string;
  sellerId:        string;
}

export interface SendQuotePayload {
  conversationId: string;
  productId:      string;
  productName:    string;
  quantity:       number;
  price:          number;
  unit:           string;
}
