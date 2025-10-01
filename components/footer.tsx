import Image from "next/image";

export function Footer() {
  return (
    <footer className="flex flex-col gap-4 items-center justify-center py-8 mt-auto">
      <div className="flex gap-6 flex-wrap items-center justify-center">
        <a
          className="flex items-center gap-2 text-cyan-400 hover:text-cyan-300 hover:underline hover:underline-offset-4 transition-colors"
          href="https://github.com/TomCat-415/wallets-quickstart"
          target="_blank"
          rel="noopener noreferrer"
        >
          <Image
            aria-hidden
            src="/file.svg"
            alt="File icon"
            width={16}
            height={16}
          />
          View code
        </a>
        <a
          className="flex items-center gap-2 text-cyan-400 hover:text-cyan-300 hover:underline hover:underline-offset-4 transition-colors"
          href="/client-demo"
        >
          <Image
            aria-hidden
            src="/code.svg"
            alt="Code icon"
            width={16}
            height={16}
          />
          Client SDK demo
        </a>

      </div>
      <div className="flex opacity-60">
        <Image
          src="/crossmint-leaf.svg"
          alt="Powered by Crossmint"
          priority
          width={152}
          height={100}
        />
      </div>
    </footer>
  );
}
