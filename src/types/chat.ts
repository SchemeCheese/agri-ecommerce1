// ─── Chat / Negotiation shared TypeScript types ───────────────────────────────

export type MessageType = 'TEXT' | 'IMAGE' | 'SYSTEM' | 'NEGOTIATION_QUOTE';
export type QuoteStatus  = 'PENDING' | 'ACCEPTED' | 'REJECTED' | 'EXPIRED';
export type ConversationType = 'GENERAL' | 'NEGOTIATION' | 'AI';

export interface ContextProduct {
  id:                   string;
  name:                 string;
  unit?:                string;
  reference_price?:     number;
  price?:               number;
  min_negotiation_qty?: number;
  image?:               string;
}

export interface QuoteData {
  messageId:   string;
  productId:   string;
  productName: string;
  quantity:    number;
  price:       number;
  unit:        string;
  status:      QuoteStatus;
}

/**
 * Chuẩn message shape từ BE (getMessages + socket newMessage).
 * Tất cả emit('newMessage') giờ cùng 1 shape.
 */
export interface Message {
  id:              string;
  message_content: string;
  message_type:    MessageType;
  created_at:      string;
  sender: {
    id:        string;
    full_name: string;
  };
  // Ngữ cảnh sản phẩm (SYSTEM chat SP / đàm phán)
  context_product?:  ContextProduct | null;
  proposed_quantity?: number | null;
  proposed_price?:    number | null;
  // Flat quote fields (DB shape, only when message_type === 'NEGOTIATION_QUOTE')
  quote_product_id?:   string;
  quote_product_name?: string;
  quote_quantity?:     number;
  quote_price?:        number;
  quote_unit?:         string;
  quote_status?:       QuoteStatus;
  // Real-time socket may emit nested quote
  quote?: QuoteData | null;
  // URL ảnh khi message_type === 'IMAGE'
  image_url?: string | null;
}

/** Extract a normalised QuoteData from any message shape (DB flat OR socket nested). */
export function extractQuote(msg: Message): QuoteData | null {
  if (msg.quote) {
    // Một số phiên bản BE emit nested quote KHÔNG kèm messageId — fallback về msg.id
    // để respondToQuote luôn nhận được id hợp lệ (tránh Prisma crash undefined).
    return { ...msg.quote, messageId: msg.quote.messageId ?? msg.id };
  }
  if (msg.message_type === 'NEGOTIATION_QUOTE' && msg.quote_product_id) {
    return {
      messageId:   msg.id,
      productId:   msg.quote_product_id,
      productName: msg.quote_product_name ?? '',
      quantity:    msg.quote_quantity    ?? 0,
      price:       msg.quote_price       ?? 0,
      unit:        msg.quote_unit        ?? 'kg',
      status:      msg.quote_status      ?? 'PENDING',
    };
  }
  return null;
}

export interface ConversationPartner {
  id:       string;
  full_name: string;
  avatar?:  string;
  profile?: { store_name?: string };
}

export function isNegotiationRequestMessage(msg: Message): boolean {
  return msg.message_type === 'SYSTEM'
    && msg.context_product != null
    && msg.proposed_quantity != null
    && msg.proposed_price != null;
}

export function isNegotiationCancelledMessage(msg: Message): boolean {
  return msg.message_type === 'SYSTEM'
    && /đã hủy cuộc đàm phán/i.test(msg.message_content);
}

export function isNegotiationQuoteMessage(msg: Message): boolean {
  return msg.message_type === 'NEGOTIATION_QUOTE';
}

/**
 * Conversation: 1 cặp buyer-seller = 1 conversation duy nhất.
 * conversation_type / product / proposedQuantity đã bị XÓA khỏi schema —
 * thông tin ngữ cảnh giờ nằm trong từng ChatMessage (context_product, proposed_*).
 */
export interface Conversation {
  id:      string;
  partner: ConversationPartner;
  lastMessage?: {
    id?:           string;
    content:       string;
    message_type?: MessageType;
    created_at:    string;
    sender_id?:    string;
  };
  unread_count?: number;
  created_at: string;
}

/** Tìm SYSTEM message đàm phán gần nhất (có context_product + proposed_quantity). */
export function extractNegotiationMsg(messages: Message[]): Message | null {
  return [...messages].reverse().find(isNegotiationRequestMessage) ?? null;
}

/**
 * Trạng thái negotiation hiện tại của conversation:
 * - REQUEST: seller còn có thể gửi báo giá / hủy
 * - QUOTE: đã có báo giá, khóa hành động seller
 * - CANCELLED: đã hủy, khóa hành động seller
 */
export function extractLatestNegotiationEvent(messages: Message[]): Message | null {
  return [...messages].reverse().find(
    (msg) => isNegotiationRequestMessage(msg) || isNegotiationCancelledMessage(msg) || isNegotiationQuoteMessage(msg),
  ) ?? null;
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
