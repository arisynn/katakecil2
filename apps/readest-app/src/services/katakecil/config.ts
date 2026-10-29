// Public reader configuration. No service-role key belongs in the application.
export const KATAKECIL_URL =
  process.env['NEXT_PUBLIC_SUPABASE_URL'] || 'https://hrbcwymdqigtfmpmsdsi.supabase.co';
export const KATAKECIL_KEY =
  process.env['NEXT_PUBLIC_SUPABASE_ANON_KEY'] || 'sb_publishable_lttlEUXKFSzkOk9Jizy8TQ_dXdS1ex-';
export const KATAKECIL_ENDPOINT = `${KATAKECIL_URL}/functions/v1/katakecil-reader`;
