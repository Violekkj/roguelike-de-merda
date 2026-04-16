import sys
import json
import os
from modules.username import verify_username

def print_banner():
    print("=" * 50)
    print("      🔍 Ferramenta OSINT - Reconhecimento")
    print("=" * 50)

def main():
    print_banner()
    
    # Captura o username pela CLI ou input.
    username = ""
    if len(sys.argv) > 1:
        username = sys.argv[1]
    else:
        try:
            username = input("Digite o username alvo: ").strip()
        except KeyboardInterrupt:
            print("\nOperação cancelada pelo usuário.")
            sys.exit(0)
    
    if not username:
        print("Erro: Username inválido ou não fornecido.")
        sys.exit(1)
        
    print(f"\n[*] Procurando pelo usuário '{username}' em vários serviços...\n")
    print("-" * 50)
    
    # Dispara os requests do módulo OSINT
    results = verify_username(username)
    
    # Exibe o output formatado e colorido
    for res in results:
        status_icon = "[✔]" if res["exists"] else "[✖]"
        color_start = "\033[92m" if res["exists"] else "\033[91m"
        color_end = "\033[0m"
        
        print(f"{color_start}{status_icon}{color_end} {res['site']}: {res['url']}")
        
    print("-" * 50)
    print("\n[*] Resultados Padronizados (Aggregator):")
    print(json.dumps(results, indent=2, ensure_ascii=False))

if __name__ == "__main__":
    # Permite cores ANSI no console do Windows.
    if os.name == 'nt':
        os.system("")
    main()
