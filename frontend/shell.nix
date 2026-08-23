{ pkgs ? import <nixpkgs> {} }:

pkgs.mkShell {
  name = "vite-frontend-env";

  buildInputs = with pkgs; [
    nodejs_24
    typescript
    typescript-language-server
  ];

  shellHook = ''
    echo "⚛️  Frontend environment active (Node $(node --version))"
    echo "💡 Run 'npm install' then 'npm run dev' to launch Vite."
  '';
}
