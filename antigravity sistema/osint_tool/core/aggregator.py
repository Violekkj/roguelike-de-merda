class Aggregator:
    def __init__(self):
        self.results = []

    def add_result(self, site: str, url: str, exists: bool):
        """
        Adiciona um resultado ao agregador de forma padronizada.
        
        Espera-se que o formato siga o contrato do requerimento:
        {
            "site": "GitHub",
            "url": "https://github.com/username",
            "exists": true
        }
        """
        result_dict = {
            "site": site,
            "url": url,
            "exists": exists
        }
        self.results.append(result_dict)

    def get_results(self) -> list:
        """
        Retorna a lista de resultados organizada e formatada na estrutura padrão.
        """
        return self.results
