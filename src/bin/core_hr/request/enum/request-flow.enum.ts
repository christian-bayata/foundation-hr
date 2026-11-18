export enum RequestDirection {
  OUTGOING = 'outgoing',
  INCOMING = 'incoming',
  SELF_SERVICE = 'self_service',
}

export enum RequestStepActionKind {
  APPROVE = 'approve',
  DECLINE = 'decline',
  VERIFY = 'verify',
  ACCEPT = 'accept',
  RESPOND = 'respond',
  REVIEW = 'review',
  SETTLEMENT = 'settlement',
  SIGN = 'sign',
  ISSUE = 'issue',
  CLOSE_PLAN = 'close_plan',
}

export enum RequestDisplayState {
  DRAFT = 'draft',
  IN_REVIEW = 'in_review',
  AWAITING_EMPLOYEE = 'awaiting_employee',
  AWAITING_RESPONSE = 'awaiting_response',
  NEEDS_YOUR_APPROVAL = 'needs_your_approval',
  QUERIED = 'queried',
  ACTIVE = 'active',
  COMPLETED = 'completed',
  WITHDRAWN = 'withdrawn',
  REJECTED = 'rejected',
  CLOSED = 'closed',
}

export enum RequestDocumentStatus {
  DRAFT = 'draft',
  SIGNED = 'signed',
  ISSUED = 'issued',
}

export enum RequestDelegationStatus {
  ACTIVE = 'active',
  EXPIRED = 'expired',
  CANCELLED = 'cancelled',
}

export enum RequestActivityType {
  CREATED = 'created',
  DRAFT_SAVED = 'draft_saved',
  SUBMITTED = 'submitted',
  APPROVED = 'approved',
  DECLINED = 'declined',
  VERIFIED = 'verified',
  ACCEPTED = 'accepted',
  RESPONDED = 'responded',
  QUERIED = 'queried',
  RESENT = 'resent',
  WITHDRAWN = 'withdrawn',
  NUDGED = 'nudged',
  REVIEWED = 'reviewed',
  PLAN_CLOSED = 'plan_closed',
  DELEGATED = 'delegated',
  ESCALATED = 'escalated',
  REMINDED = 'reminded',
  DOCUMENT_ADDED = 'document_added',
  DOCUMENT_ISSUED = 'document_issued',
  VIEWED = 'viewed',
}
