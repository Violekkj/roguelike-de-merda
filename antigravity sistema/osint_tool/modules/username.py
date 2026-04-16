import sys
import os

# Adiciona o diretório principal ao sys.path para importações a partir de outros lugares
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from utils.http_client import check_url_status
from core.aggregator import Aggregator

# Dicionário de serviços que mapeiam os nomes aos templates de URL
SITES = {
    "GitHub": "https://github.com/{}",
    "Instagram": "https://www.instagram.com/{}/",
    "Twitter": "https://twitter.com/{}",
    "Reddit": "https://www.reddit.com/user/{}/"
}

def verify_username(username: str) -> list:
    """
    Recebe o username alvo e itera sobre as redes sociais.
    Ao final, devolve uma lista organizada gerada pelo componente Aggregator.
    """
    aggregator = Aggregator()
    
    for site_name, url_template in SITES.items():
        url = url_template.format(username)
        # Check reutilizável com tratamento de erros.
        exists, status = check_url_status(url)
        # Padronização de estrutura delegada para o agregador.
        aggregator.add_result(site_name, url, exists)
        
    return aggregator.get_results()
