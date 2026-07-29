/**
 * Marks tenant-facing copy declared outside React components for catalog
 * extraction. Translate the returned fallback with `tText` at render time.
 */
export function tenantMessage<const Message extends string>(
  message: Message,
): Message {
  return message;
}
