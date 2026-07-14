import LineFriendCTA from '@/components/LineFriendCTA';

export default function WebLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-gray-50">
      <LineFriendCTA variant="banner" />
      {children}
      <footer className="text-center text-xs text-gray-400 py-8 px-4">
        © test美容室
      </footer>
    </div>
  );
}