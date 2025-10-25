/**
 * Users Layout
 *
 * Note: Authentication is handled by the parent /admin layout.
 * This layout is kept for future users-specific features if needed.
 */
export default function UsersLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}