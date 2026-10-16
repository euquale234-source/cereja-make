// Dados da loja. Edite aqui e o site inteiro atualiza.
// Campos com valor null ainda não foram confirmados pela cliente: no site aparecem como "a confirmar"
// até você escrever o texto entre aspas. Nunca use travessão (o traço longo); use vírgula ou dois pontos.
window.LOJA = {
  modoPrevia: true,           // true: mostra "a confirmar" onde falta dado da cliente. Troque para false só quando tudo estiver preenchido.
  nome: "Cereja Make",
  instagram: "cerejamakee",
  whatsapp: "5596981206560",          // só números, com DDI 55 e DDD 96
  whatsappBonito: "(96) 98120-6560",
  endereco: "Av. Maria das Graças Picanço, 2140, Novo Horizonte, Macapá, AP",
  mapa: "https://www.google.com/maps/search/?api=1&query=Av.+Maria+das+Gra%C3%A7as+Pican%C3%A7o%2C+2140%2C+Novo+Horizonte%2C+Macap%C3%A1+-+AP",
  inauguracao: "Inaugurada em 25 de julho de 2026.",

  // Tudo abaixo está pendente de confirmação com a cliente. Exemplos do que escrever estão nos comentários.
  horario: null,              // ex.: "Seg a sáb, das 9h às 18h40"
  prazo: null,                // ex.: "Entrega hoje ou amanhã" ou "Entregas às sextas, pedidos até quinta às 18h"
  pedidoMinimo: null,         // ex.: "Sem pedido mínimo." ou "Entrega grátis a partir de R$ 30."
  minimoEntregaGratis: null,  // número, ex.: 30 (só se houver pedido mínimo pra entrega grátis)
  pagamento: null,            // ex.: "Pix, dinheiro ou cartão, na entrega ou na loja."
  politicaTroca: null,        // ex.: "que a gente troca." (completa a frase "Manda uma foto no WhatsApp ...")
  conferencia: null,          // ex.: "A gente confere lote e validade antes de entregar."
  ajudaTom: true,             // true se a equipe ajuda a escolher o tom por foto no WhatsApp; false se não
  horarioResposta: null,      // ex.: "Respondemos em minutos no horário da loja."
  oiapoque: null,             // ex.: "Mandamos pela Amazon Bus; você retira no guichê de Oiapoque. Taxa de R$ 25, chega em 2 dias."
  cnpj: null,                 // ex.: "12.345.678/0001-90"
  pontoReferencia: null,      // ex.: "em frente à praça do Novo Horizonte"
  novaCereja: null,           // ex.: "Em breve, uma segunda loja no bairro Pacoval."
  logoOficial: null,          // "perfil", "neon" ou "didone": qual lettering é o oficial

  // Os mais pedidos: lista a confirmar com a cliente a partir do post "Produtos que mais saíram por aqui".
  // Enquanto maisPedidosConfirmado for false, a seção mostra a sugestão abaixo sem selo nem ranking.
  maisPedidosConfirmado: false,
  maisPedidos: [
    "cherry-bomb-01",
    "mascara-para-cilios-melu-01",
    "lip-oil-glow-01",
    "cartela-cilios-30p-01",
    "lenco-demaquilante-01",
    "gloss-franboesa-01"
  ],

  // Seção de R$ 10 da página inicial: os produtos que aparecem lá (o resto está no catálogo).
  dezReais: [
    "lip-oil-glow-01",
    "gloss-moranguinho-01",
    "creme-corporal-cereja-01",
    "brinco-folheado-01",
    "tufinho-mix-20p-01",
    "sabonete-liquido-cereja-01",
    "lenco-demaquilante-01",
    "gel-para-sobrancelhas-01"
  ],

  // Marcas confirmadas (aparecem nas fotos ou na pesquisa) e marcas ainda a confirmar.
  marcas: [
    { nome: "Ruby Rose", quemE: "" },
    { nome: "Melu", quemE: "a marca da Ruby Rose pra geração Z" },
    { nome: "Fenzza", quemE: "" },
    { nome: "Mia Make", quemE: "" },
    { nome: "Lua & Neve", quemE: "" },
    { nome: "Mahav", quemE: "" },
    { nome: "Adversa", quemE: "" },
    { nome: "Dermachem", quemE: "" },
    { nome: "Pink 21", quemE: "" },
    { nome: "Vivai", quemE: "" },
    { nome: "We Candy", quemE: "" },
    { nome: "PAM! by Pamella", quemE: "" },
    { nome: "Franciny Ehlke", quemE: "" },
    { nome: "Playboy", quemE: "" },
    { nome: "Miss Frandy", quemE: "" },
    { nome: "Dapop", quemE: "" },
    { nome: "Pink Girls", quemE: "" },
    { nome: "Bobbi Rara", quemE: "" },
    { nome: "Dafu", quemE: "" },
    { nome: "Belle Angel", quemE: "" }
  ],
  marcasAConfirmar: [],

  // Tabela de entrega por bairro (do destaque da moto no Instagram).
  bairros: [
    { taxa: 0,  nomes: ["Novo Horizonte", "Jardim Felicidade 1", "Jardim Felicidade 2", "Renascer", "Ipê"] },
    { taxa: 5,  nomes: ["Brasil Novo", "Boné Azul", "Infraero I", "Infraero II", "Amazonas", "Lagoa Azul"] },
    { taxa: 10, nomes: ["São Lázaro", "Pacoval", "Cidade Nova", "Laguinho", "Santa Rita"] },
    { taxa: 14, nomes: ["Central", "Trem", "Buritizal", "Novo Buritizal", "Congós"] }
  ],

  // Depoimentos (texto literal dos prints, sem nome). Publicação depende da autorização das clientes.
  depoimentosAutorizados: false,
  depoimentos: [
    "Meu novo xodó",
    "Obrigadaaaa, amando cada compra!!!",
    "já tô usando minhas argolinhas",
    "eu não encontrei de jeito nenhum esse gelzinho da ruby rose rosa bebê, então foi na @cerejamakee e comprei esse da melu",
    "Ela amou as presilhas"
  ]
};
