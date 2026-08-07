export interface NewsletterFormState {
  status: 'idle' | 'success' | 'error';
  message: string | null;
}

export const initialNewsletterFormState: NewsletterFormState = {
  status: 'idle',
  message: null,
};
