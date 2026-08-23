{ pkgs ? import <nixpkgs> {} }:

pkgs.mkShell {
  name = "python-backend-env";

  buildInputs = with pkgs; [
    python313
    stdenv.cc.cc.lib # Crucial on Arch/CachyOS for compiling heavy Python packages (like NumPy/pydantic)
    git
  ];

  shellHook = ''
    # Fixes dynamic linking errors for C-extensions in Python wheels
    export LD_LIBRARY_PATH="${pkgs.stdenv.cc.cc.lib}/lib:$LD_LIBRARY_PATH"

    # Automatically create and activate a virtual environment if it doesn't exist
    if [ ! -d ".venv" ]; then
      echo "📦 Creating Python virtual environment..."
      python -m venv .venv
    fi
    source .venv/bin/activate

    echo "🐍 Backend environment active (Python $(python --version))"
  '';
}
