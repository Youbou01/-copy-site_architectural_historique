export interface Admin {
  id: string;
  username: string;
  passwordHash: string;
  role: 'admin';
  dernierLogin?: Date | string;
}

/**
 * Interface for comment moderation actions
 */
export interface CommentModerationAction {
  /** The comment ID to moderate */
  commentId: string;
  
  /** The patrimoine ID where the comment belongs */
  patrimoineId: string;
  
  /** The monument ID where the comment belongs (optional) */
  monumentId?: string;
  
  /** The new state for the comment */
  newState: 'approuvé' | 'rejeté';
}

/**
 * Interface for new comment submission
 */
export interface NewCommentSubmission {
  /** Author name */
  nom: string;
  
  /** Comment message */
  message: string;
  
  /** Optional rating (1-5) */
  note?: number;
  
  /** The patrimoine ID where the comment will be added */
  patrimoineId: string;
  
  /** The monument ID where the comment will be added (optional) */
  monumentId?: string;
}
