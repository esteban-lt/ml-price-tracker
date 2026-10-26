// RFC 2369 and RFC 8058: lets mail clients show an "Unsubscribe" button that POSTs to this URL.
export function listUnsubscribeHeaders(oneClickUrl: string): Record<string, string> {
  return {
    'List-Unsubscribe': `<${oneClickUrl}>`,
    'List-Unsubscribe-Post': 'List-Unsubscribe=One-Click',
  };
}
