import { notification } from 'antd';

export async function copyContent(text: string) {
  try {
    await navigator.clipboard.writeText(text);
    console.log('Content copied to clipboard');
    /* Resolved - text copied to clipboard successfully */

    notification.success({ message: 'Copied!' });
  } catch (err) {
    console.error('Failed to copy: ', err);
    /* Rejected - text failed to copy to the clipboard */
  }
}
