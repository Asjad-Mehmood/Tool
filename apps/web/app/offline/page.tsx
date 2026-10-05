export const metadata = { title: "Offline", robots: { index: false } };
export default function Offline() {
  return <div className="mx-auto max-w-md py-16 text-center"><h1 className="text-3xl font-extrabold">You’re offline</h1><p className="mt-2 text-slate-600">Tools you’ve already opened still work. Reconnect to open new ones.</p></div>;
}
