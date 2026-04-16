import requests
from requests.exceptions import RequestException

def check_url_status(url, timeout=5):
    """
    Verifica se uma URL está acessível retornando status histórico.
    Simula um User-Agent moderno para evitar bloqueios triviais de scraping.
    """
    headers = {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/115.0.0.0 Safari/537.36'
    }
    try:
        # Usamos GET porque redes sociais podem bloquear requisições HEAD ou falhar.
        # Adicionamos timeouts nas requisições.
        response = requests.get(url, headers=headers, timeout=timeout, allow_redirects=True)
        
        # Consideramos 200 como existência (O requerimento diz: status code 200 ou não).
        # É importante notar que em cenários reais, sites como Instagram costumam retornar login page (200),
        # por conta da mudança de política, porém seguiremos a arquitetura proposta.
        if response.status_code == 200:
            return True, response.status_code
        else:
            return False, response.status_code
            
    except RequestException as e:
        # Erros de timeout ou indisponibilidade caem aqui.
        return False, str(e)
