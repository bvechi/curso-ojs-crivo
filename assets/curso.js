// Conclusão das atividades, questionários e lição do curso.
// O progresso fica só no localStorage deste navegador.
(function () {
  "use strict";
  var CHAVE = "curso-ojs-crivo:concluidas";
  var VISTAS = "curso-ojs-crivo:vistas";

  function ler(chave) {
    try { return JSON.parse(localStorage.getItem(chave)) || {}; } catch (e) { return {}; }
  }
  function gravar(chave, obj) {
    try { localStorage.setItem(chave, JSON.stringify(obj)); } catch (e) { /* sem armazenamento */ }
  }
  function concluir(id) {
    if (!id) return;
    var c = ler(CHAVE); c[id] = new Date().toISOString(); gravar(CHAVE, c);
    atualizarBotoes();
  }

  var atividade = document.body.getAttribute("data-atividade");
  if (atividade) {
    var v = ler(VISTAS); v[atividade] = true; gravar(VISTAS, v);
  }
  // Páginas: ver basta para concluir (como "Visualizar" no Moodle).
  var PAGINAS_VISTAS = ["u00-01", "u00-02", "u01-01"];
  if (PAGINAS_VISTAS.indexOf(atividade) >= 0) concluir(atividade);

  function atualizarBotoes() {
    var c = ler(CHAVE);
    document.querySelectorAll("button.marcar").forEach(function (b) {
      var feita = !!c[b.dataset.atividade];
      b.classList.toggle("feita", feita);
      b.textContent = feita ? "Concluída ✓ (clique para desmarcar)" : "Marcar como concluída";
      b.setAttribute("aria-pressed", feita ? "true" : "false");
    });
    var total = 0, feitas = 0;
    document.querySelectorAll("[data-marca]").forEach(function (m) {
      total++;
      var f = !!c[m.dataset.marca];
      if (f) feitas++;
      m.classList.toggle("feita", f);
      m.setAttribute("aria-pressed", f ? "true" : "false");
    });
    var p = document.querySelector(".progresso");
    if (p && total) p.textContent = "Você concluiu " + feitas + " de " + total + " atividades neste navegador.";
  }

  document.querySelectorAll("button.marcar").forEach(function (b) {
    b.addEventListener("click", function () {
      var c = ler(CHAVE);
      if (c[b.dataset.atividade]) { delete c[b.dataset.atividade]; gravar(CHAVE, c); atualizarBotoes(); }
      else concluir(b.dataset.atividade);
    });
  });
  document.querySelectorAll("button[data-marca]").forEach(function (m) {
    m.addEventListener("click", function () {
      var c = ler(CHAVE);
      if (c[m.dataset.marca]) { delete c[m.dataset.marca]; gravar(CHAVE, c); atualizarBotoes(); }
      else concluir(m.dataset.marca);
    });
  });
  atualizarBotoes();

  // Painel lateral do glossário: abre no clique em um termo ou papel.
  var DADOS = window.GLOSSARIO_DADOS || {};
  var raiz = document.body.getAttribute("data-raiz") || "";
  var painel = null, gatilho = null;

  function criarPainel() {
    painel = document.createElement("aside");
    painel.className = "painel-glossario";
    painel.id = "painel-glossario";
    painel.setAttribute("role", "dialog");
    painel.setAttribute("aria-labelledby", "painel-titulo");
    painel.hidden = true;
    painel.innerHTML =
      '<div class="painel-topo"><p class="painel-rotulo">Glossário</p>' +
      '<button type="button" class="painel-fechar" aria-label="Fechar o glossário">Fechar ✕</button></div>' +
      '<h2 id="painel-titulo" tabindex="-1"></h2><div class="painel-corpo"></div>' +
      '<p class="painel-mais"><a href="#">Ver no glossário completo</a></p>';
    document.body.appendChild(painel);
    painel.querySelector(".painel-fechar").addEventListener("click", fecharPainel);
    // Termos relacionados e papéis dentro do painel abrem no próprio painel.
    painel.addEventListener("click", function (e) {
      var alvo = e.target.closest("[data-termo], .painel-corpo a[href^='#']");
      if (!alvo) return;
      var id = alvo.getAttribute("data-termo") || alvo.getAttribute("href").slice(1);
      if (DADOS[id]) { e.preventDefault(); mostrar(id); }
    });
  }

  function mostrar(id) {
    var d = DADOS[id];
    if (!d) return false;
    if (!painel) criarPainel();
    painel.querySelector("#painel-titulo").textContent = d.t;
    painel.querySelector(".painel-rotulo").textContent = d.r || "Glossário";
    painel.querySelector(".painel-fechar").setAttribute("aria-label", d.r ? "Fechar o guia" : "Fechar o glossário");
    painel.querySelector(".painel-corpo").innerHTML = d.h.split("{RAIZ}").join(raiz);
    var mais = painel.querySelector(".painel-mais");
    mais.hidden = !d.g;
    if (d.g) mais.querySelector("a").href = raiz + "glossario.html#" + d.g;
    painel.hidden = false;
    document.body.classList.add("painel-aberto");
    painel.scrollTop = 0;
    painel.querySelector("#painel-titulo").focus();
    return true;
  }

  function fecharPainel() {
    if (!painel || painel.hidden) return;
    painel.hidden = true;
    document.body.classList.remove("painel-aberto");
    if (gatilho && document.contains(gatilho)) gatilho.focus();
  }

  document.addEventListener("click", function (e) {
    var alvo = e.target.closest("[data-termo]");
    if (!alvo || (painel && painel.contains(alvo))) return;
    if (DADOS[alvo.getAttribute("data-termo")]) {
      e.preventDefault();
      gatilho = alvo;
      mostrar(alvo.getAttribute("data-termo"));
    }
  });
  document.addEventListener("keydown", function (e) {
    if (e.key === "Escape") fecharPainel();
  });

  // Glossário: busca por termo ou definição.
  var busca = document.getElementById("busca-glossario");
  var fixo = document.querySelector(".glossario-fixo, .barra-fixa");
  if (fixo) {
    // Ao saltar para uma letra ou termo, o título não fica escondido sob a barra fixa.
    var medir = function () {
      document.documentElement.style.setProperty("--altura-fixo", (fixo.offsetHeight + 12) + "px");
    };
    medir();
    window.addEventListener("resize", medir);
  }
  if (busca) {
    var semAcento = function (s) { return s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase(); };
    var termos = document.querySelectorAll(".glossario .termo");
    var res = document.querySelector(".busca-resultado");
    var vazio = document.querySelector(".sem-resultado");
    // Texto pesquisável sem o conteúdo das caixinhas de papel.
    termos.forEach(function (t) {
      var copia = t.cloneNode(true);
      copia.querySelectorAll(".papel-dica").forEach(function (d) { d.remove(); });
      t.dataset.texto = semAcento(t.dataset.busca + " " + copia.textContent);
    });
    busca.addEventListener("input", function () {
      var q = semAcento(busca.value.trim());
      var n = 0;
      termos.forEach(function (t) {
        var ok = !q || t.dataset.texto.indexOf(q) >= 0;
        t.hidden = !ok;
        if (ok) n++;
      });
      document.querySelectorAll(".glossario .letra").forEach(function (s) {
        s.hidden = !s.querySelector(".termo:not([hidden])");
      });
      vazio.hidden = n > 0;
      res.textContent = q ? (n === 1 ? "1 termo encontrado." : n + " termos encontrados.") : "";
    });
  }

  // Gavetas: menu do curso (☰) e sumário lateral dos livros.
  var fundo = null, gavetaAberta = null, gatilhoGaveta = null;
  var largo = window.matchMedia("(min-width: 62rem)");
  var CHAVE_LATERAL = "curso-ojs-crivo:sumario-lateral";
  function abrirGaveta(el, botao, comFundo) {
    el.hidden = false;
    if (botao) botao.setAttribute("aria-expanded", "true");
    if (comFundo) {
      fundo = document.createElement("div");
      fundo.className = "fundo-gaveta";
      fundo.addEventListener("click", function () { fecharGaveta(el); });
      document.body.appendChild(fundo);
      gavetaAberta = el;
      gatilhoGaveta = botao;
      var primeiro = el.querySelector("[aria-current=page]") || el.querySelector("a, button");
      if (primeiro) primeiro.focus();
    }
  }
  function fecharGaveta(el) {
    el.hidden = true;
    document.querySelectorAll('[aria-controls="' + el.id + '"]').forEach(function (b) { b.setAttribute("aria-expanded", "false"); });
    if (fundo) { fundo.remove(); fundo = null; }
    if (el.id === "sumario-lateral") {
      // Em tela larga o sumário do livro não fecha: fica sempre ao lado do texto.
      if (largo.matches) { el.hidden = false; return; }
      document.body.classList.remove("lateral-aberta");
    }
    if (gavetaAberta === el && gatilhoGaveta) gatilhoGaveta.focus();
    gavetaAberta = null;
  }
  var menu = document.getElementById("menu-curso");
  var botaoMenu = document.querySelector(".botao-menu");
  if (menu && botaoMenu) {
    // Destaca a página atual no menu.
    var aqui = location.href.split("#")[0];
    var achou = false;
    menu.querySelectorAll("a").forEach(function (a) {
      if (a.href.split("#")[0] === aqui && !a.classList.contains("menu-secao")) { a.setAttribute("aria-current", "page"); achou = true; }
    });
    if (!achou) {
      // Capítulo de livro: destaca o livro a que ele pertence.
      var pasta = aqui.slice(0, aqui.lastIndexOf("/") + 1);
      menu.querySelectorAll("a").forEach(function (a) {
        if (a.href === pasta + "index.html") a.setAttribute("aria-current", "page");
      });
    }
    botaoMenu.addEventListener("click", function () {
      if (menu.hidden) abrirGaveta(menu, botaoMenu, true); else fecharGaveta(menu);
    });
  }
  var lateral = document.getElementById("sumario-lateral");
  var botaoSumario = document.querySelector(".botao-sumario");
  if (lateral && botaoSumario) {
    var ajustarLateral = function () {
      // Escolha antiga de fechar o sumário, de versões anteriores: deixa de valer.
      try { localStorage.removeItem(CHAVE_LATERAL); } catch (e) { /* sem armazenamento */ }
      if (largo.matches) {
        lateral.classList.add("fixo");
        lateral.hidden = false;
        document.body.classList.add("lateral-aberta");
        botaoSumario.setAttribute("aria-expanded", "true");
      } else {
        lateral.classList.toggle("fixo", largo.matches);
        lateral.hidden = true;
        document.body.classList.remove("lateral-aberta");
        botaoSumario.setAttribute("aria-expanded", "false");
      }
    };
    ajustarLateral();
    largo.addEventListener("change", ajustarLateral);
    botaoSumario.addEventListener("click", function () {
      if (!lateral.hidden) { fecharGaveta(lateral); return; }
      if (largo.matches) {
        ajustarLateral();
      } else {
        abrirGaveta(lateral, botaoSumario, true);
      }
    });
  }
  document.querySelectorAll(".gaveta-fechar").forEach(function (b) {
    b.addEventListener("click", function () { fecharGaveta(document.getElementById(b.dataset.fecha)); });
  });
  document.addEventListener("keydown", function (e) {
    if (e.key === "Escape" && gavetaAberta) fecharGaveta(gavetaAberta);
  });

  // Voltar ao início: aparece depois que a pessoa rola mais de uma tela.
  var topo = document.createElement("button");
  topo.type = "button";
  topo.className = "voltar-topo";
  topo.textContent = "↑ Voltar ao início";
  topo.hidden = true;
  document.body.appendChild(topo);
  topo.addEventListener("click", function () {
    var calmo = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    window.scrollTo({ top: 0, behavior: calmo ? "auto" : "smooth" });
    var alvo = document.querySelector("h1");
    if (alvo) { alvo.setAttribute("tabindex", "-1"); alvo.focus({ preventScroll: true }); }
  });
  var conferirTopo = function () { topo.hidden = window.scrollY < 300; };
  window.addEventListener("scroll", conferirTopo, { passive: true });
  conferirTopo();

  // Busca nas páginas de consulta (curiosidades e leituras): esconde o que não combina.
  document.querySelectorAll("input.busca-pagina").forEach(function (campo) {
    var tirarAcento = function (s) { return s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase(); };
    var itens = document.querySelectorAll(campo.dataset.itens);
    var conjuntos = document.querySelectorAll(campo.dataset.conjuntos);
    var aviso = campo.closest(".barra-fixa").querySelector(".busca-resultado");
    var nada = document.querySelector(".sem-resultado");
    itens.forEach(function (it) { it.dataset.texto = tirarAcento(it.textContent); });
    campo.addEventListener("input", function () {
      var q = tirarAcento(campo.value.trim());
      var n = 0;
      itens.forEach(function (it) {
        var ok = !q || it.dataset.texto.indexOf(q) >= 0;
        it.hidden = !ok;
        if (ok && !it.classList.contains("cartao-tema")) n++;
      });
      conjuntos.forEach(function (c) { c.hidden = !!q && !c.querySelector(campo.dataset.itens.split(",").map(function (s) { return s.trim() + ":not([hidden])"; }).join(",")); });
      if (nada) nada.hidden = !q || n > 0;
      aviso.textContent = q ? (n === 1 ? "1 resultado." : n + " resultados.") : "";
    });
  });

  // Tabela de comparação: marcações guardadas no navegador e download em Word (.docx).
  document.querySelectorAll(".comparacao").forEach(function (bloco) {
    var chave = "curso-ojs-crivo:comparacao:" + bloco.dataset.comparacao;
    var colunas = bloco.dataset.colunas.split("|");
    var linhas = bloco.querySelectorAll("tr[data-linha]");
    var aviso = bloco.querySelector(".aviso-comparacao");

    function situacao(marcas) {
      var real = marcas[0], treino = marcas[1];
      if (real === undefined && treino === undefined) return "";
      if (real && treino) return "Completo";
      if (real && !treino) return "Falta no treinamento";
      if (!real && treino) return "Só no treinamento";
      return "Não encontrado";
    }
    function estado() {
      var d = {};
      linhas.forEach(function (tr) {
        var caixas = tr.querySelectorAll("input[type=checkbox]");
        d[tr.dataset.linha] = {
          m: Array.prototype.map.call(caixas, function (c) { return c.checked; }),
          t: tr.dataset.tocada === "1",
          o: tr.querySelector(".obs").value
        };
      });
      return d;
    }
    function mostrar(tr) {
      var caixas = tr.querySelectorAll("input[type=checkbox]");
      var marcas = tr.dataset.tocada === "1" ? Array.prototype.map.call(caixas, function (c) { return c.checked; }) : [];
      var s = situacao(marcas);
      var cel = tr.querySelector(".situacao");
      cel.textContent = s;
      cel.className = "situacao" + (s === "Falta no treinamento" ? " falta" : s === "Completo" ? " ok" : "");
    }
    function salvar() {
      try { localStorage.setItem(chave, JSON.stringify(estado())); } catch (e) { /* sem armazenamento */ }
    }
    var salvo = {};
    try { salvo = JSON.parse(localStorage.getItem(chave)) || {}; } catch (e) { salvo = {}; }
    linhas.forEach(function (tr) {
      var s = salvo[tr.dataset.linha];
      var caixas = tr.querySelectorAll("input[type=checkbox]");
      if (s) {
        caixas.forEach(function (c, i) { c.checked = !!s.m[i]; });
        tr.dataset.tocada = s.t ? "1" : "";
        tr.querySelector(".obs").value = s.o || "";
      }
      mostrar(tr);
      caixas.forEach(function (c) {
        c.addEventListener("change", function () { tr.dataset.tocada = "1"; mostrar(tr); salvar(); });
      });
      tr.querySelector(".obs").addEventListener("input", salvar);
    });

    bloco.querySelector("[data-acao=respostas]").addEventListener("click", function () {
      baixarDocx(bloco.dataset.titulo, colunas, linhas, true);
      aviso.textContent = "Arquivo com as suas respostas baixado.";
    });
    bloco.querySelector("[data-acao=branco]").addEventListener("click", function () {
      baixarDocx(bloco.dataset.titulo, colunas, linhas, false);
      aviso.textContent = "Tabela em branco baixada.";
    });
    bloco.querySelector("[data-acao=limpar]").addEventListener("click", function () {
      if (!window.confirm("Apagar todas as marcações e observações desta tabela?")) return;
      linhas.forEach(function (tr) {
        tr.querySelectorAll("input[type=checkbox]").forEach(function (c) { c.checked = false; });
        tr.dataset.tocada = "";
        tr.querySelector(".obs").value = "";
        mostrar(tr);
      });
      try { localStorage.removeItem(chave); } catch (e) { /* sem armazenamento */ }
      aviso.textContent = "Marcações apagadas.";
    });
  });

  // Registro da auditoria (U3): Conferido, Ajustado ou Pendente por item e idioma.
  // Todos os quadros com o mesmo data-registro dividem o mesmo armazenamento:
  // o painel lateral, presente em todas as páginas do livro, e o resumo da última página.
  var blocosRegistro = Array.prototype.slice.call(document.querySelectorAll(".registro"));
  function chaveRegistro(bloco) { return "curso-ojs-crivo:registro:" + bloco.dataset.registro; }
  function lerRegistro(bloco) {
    try { return JSON.parse(localStorage.getItem(chaveRegistro(bloco))) || {}; } catch (e) { return {}; }
  }
  function gravarRegistro(bloco, item, campo, valor) {
    var dados = lerRegistro(bloco);
    dados[item] = dados[item] || {};
    dados[item][campo] = valor;
    try { localStorage.setItem(chaveRegistro(bloco), JSON.stringify(dados)); } catch (e) { /* sem armazenamento */ }
  }
  function itensDoBloco(bloco) { return Array.prototype.slice.call(bloco.querySelectorAll("[data-item]")); }
  function preencherRegistro(bloco) {
    var dados = lerRegistro(bloco);
    itensDoBloco(bloco).forEach(function (el) {
      var d = dados[el.dataset.item] || {};
      el.querySelectorAll("select").forEach(function (s) { s.value = d[s.dataset.idioma] || ""; });
      var obs = el.querySelector(".obs");
      if (obs && document.activeElement !== obs) obs.value = d.obs || "";
    });
  }
  function atualizarRegistros() { blocosRegistro.forEach(preencherRegistro); }

  blocosRegistro.forEach(function (bloco) {
    var aviso = bloco.querySelector(".aviso-registro");
    preencherRegistro(bloco);
    itensDoBloco(bloco).forEach(function (el) {
      el.querySelectorAll("select").forEach(function (s) {
        s.addEventListener("change", function () {
          gravarRegistro(bloco, el.dataset.item, s.dataset.idioma, s.value);
          atualizarRegistros();
          if (aviso) aviso.textContent = "Registro guardado neste navegador.";
        });
      });
      var obs = el.querySelector(".obs");
      if (obs) obs.addEventListener("input", function () {
        gravarRegistro(bloco, el.dataset.item, "obs", obs.value);
        atualizarRegistros();
      });
    });
    var baixar = bloco.querySelector("[data-acao=baixar]");
    if (baixar) baixar.addEventListener("click", function () {
      baixarRegistroDocx(bloco.dataset.titulo, bloco.dataset.idiomas.split("|"), itensDoBloco(bloco));
      if (aviso) aviso.textContent = "Registro baixado em Word.";
    });
    var pdf = bloco.querySelector("[data-acao=pdf]");
    if (pdf) pdf.addEventListener("click", function () { imprimirRegistro(bloco); });
    var limpar = bloco.querySelector("[data-acao=limpar]");
    if (limpar) limpar.addEventListener("click", function () {
      if (!window.confirm("Apagar todo o registro da auditoria deste livro?")) return;
      try { localStorage.removeItem(chaveRegistro(bloco)); } catch (e) { /* sem armazenamento */ }
      atualizarRegistros();
      if (aviso) aviso.textContent = "Registro apagado.";
    });
  });
  // Ao voltar para a página pelo histórico, mostra o que foi marcado em outras páginas.
  window.addEventListener("pageshow", atualizarRegistros);

  // Painel do registro: faixa na metade de baixo da tela. Fica aberto ou fechado entre as páginas do livro.
  var painelRegistro = document.getElementById("painel-registro");
  var CHAVE_PAINEL_REGISTRO = "curso-ojs-crivo:painel-registro";
  function botoesRegistro() { return document.querySelectorAll(".botao-registro"); }
  function abrirRegistro(focar) {
    if (!painelRegistro) return;
    painelRegistro.hidden = false;
    document.body.classList.add("registro-aberto");
    botoesRegistro().forEach(function (b) { b.setAttribute("aria-expanded", "true"); });
    try { localStorage.setItem(CHAVE_PAINEL_REGISTRO, "aberto"); } catch (e) { /* sem armazenamento */ }
    if (focar) painelRegistro.querySelector("#registro-titulo").focus();
  }
  function fecharRegistro(devolverFoco) {
    if (!painelRegistro) return;
    painelRegistro.hidden = true;
    document.body.classList.remove("registro-aberto");
    botoesRegistro().forEach(function (b) { b.setAttribute("aria-expanded", "false"); });
    try { localStorage.setItem(CHAVE_PAINEL_REGISTRO, "fechado"); } catch (e) { /* sem armazenamento */ }
    var b = botoesRegistro()[0];
    if (devolverFoco && b) b.focus();
  }
  if (painelRegistro) {
    // Itens da página atual ficam em destaque no painel.
    var atuais = [];
    document.querySelectorAll(".registro-nota[data-registro-itens]").forEach(function (n) {
      atuais = atuais.concat(n.dataset.registroItens.split("|"));
    });
    var primeiroAtual = null;
    painelRegistro.querySelectorAll("[data-item]").forEach(function (el) {
      if (atuais.indexOf(el.dataset.item) !== -1) {
        el.classList.add("registro-atual");
        if (!primeiroAtual) primeiroAtual = el;
      }
    });
    function mostrarAtual() {
      if (primeiroAtual) painelRegistro.querySelector(".registro-painel").scrollLeft = primeiroAtual.offsetLeft - 16;
    }
    // O botão do alto da página abre e fecha. O botão "Abrir o registro" das notas só abre.
    botoesRegistro().forEach(function (b) {
      b.addEventListener("click", function () {
        if (painelRegistro.hidden) { abrirRegistro(true); mostrarAtual(); } else { fecharRegistro(false); }
      });
    });
    document.querySelectorAll(".abre-registro:not(.botao-registro)").forEach(function (b) {
      b.addEventListener("click", function () { abrirRegistro(true); mostrarAtual(); });
    });
    painelRegistro.querySelector(".registro-fechar").addEventListener("click", function () { fecharRegistro(true); });
    painelRegistro.addEventListener("keydown", function (e) {
      if (e.key === "Escape") { e.stopPropagation(); fecharRegistro(true); }
    });
    // Na primeira visita, fica fechado. Depois, vale o que a pessoa escolheu.
    var salvo = "";
    try { salvo = localStorage.getItem(CHAVE_PAINEL_REGISTRO) || ""; } catch (e) { salvo = ""; }
    if (salvo === "aberto") { abrirRegistro(false); mostrarAtual(); }
  }

  // PDF do registro: abre a impressão só com o registro, ao lado do que a pessoa marcou na Unidade 2.
  function situacaoU02(dados, indice) {
    var s = dados[indice];
    if (!s || !s.t) return "Não marcado";
    var real = s.m[0], treino = s.m[1];
    if (real && treino) return "Completo";
    if (real && !treino) return "Falta no treinamento";
    if (!real && treino) return "Só no treinamento";
    return "Não encontrado";
  }
  function imprimirRegistro(bloco) {
    function esc(s) { return String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;"); }
    var dadosU = document.getElementById("dados-u02");
    var u02Itens = dadosU ? dadosU.dataset.itens.split("|") : [];
    var u02Idiomas = dadosU ? dadosU.dataset.idiomas.split("|") : [];
    var u02 = {};
    try { u02 = JSON.parse(localStorage.getItem("curso-ojs-crivo:comparacao:" + (dadosU ? dadosU.dataset.chave : ""))) || {}; } catch (e) { u02 = {}; }
    var temU02 = Object.keys(u02).length > 0;
    var dados = lerRegistro(bloco);
    var idiomas = bloco.dataset.idiomas.split("|");
    var linhas = "";
    itensDoBloco(bloco).forEach(function (el) {
      var item = el.dataset.item, d = dados[item] || {};
      idiomas.forEach(function (idioma, j) {
        var pos = u02Itens.indexOf(item), pi = u02Idiomas.indexOf(idioma);
        var antes = pos === -1 || pi === -1 ? "—" : situacaoU02(u02, pos * u02Idiomas.length + pi);
        linhas += "<tr>" + (j === 0 ? '<th scope="rowgroup" rowspan="' + idiomas.length + '">' + esc(item) + "</th>" : "") +
          "<td>" + esc(idioma) + "</td><td>" + esc(antes) + "</td><td>" + esc(d[idioma] || "—") + "</td>" +
          (j === 0 ? '<td rowspan="' + idiomas.length + '">' + esc(d.obs || "") + "</td>" : "") + "</tr>";
      });
    });
    var velho = document.getElementById("impressao-registro");
    if (velho) velho.remove();
    var sec = document.createElement("section");
    sec.id = "impressao-registro";
    sec.innerHTML = "<h1>Registro da auditoria: Unidade 3</h1>" +
      "<p>Curso OJS 3.5 para a equipe da Revista Crivo · registro de " + esc(new Date().toLocaleDateString("pt-BR")) + "</p>" +
      "<p><strong>Na Unidade 2:</strong> o que você marcou ao comparar a Crivo com o ambiente de treinamento. " +
      "<strong>Agora:</strong> Conferido (já estava certo), Ajustado (alterado e verificado no site) ou Pendente.</p>" +
      (temU02 ? "" : "<p><strong>Atenção:</strong> não há marcas da Unidade 2 neste navegador. A coluna da Unidade 2 ficou sem dados.</p>") +
      '<table><thead><tr><th scope="col">Item</th><th scope="col">Idioma</th><th scope="col">Na Unidade 2</th>' +
      '<th scope="col">Agora</th><th scope="col">Observações</th></tr></thead><tbody>' + linhas + "</tbody></table>";
    document.body.appendChild(sec);
    document.body.classList.add("imprimindo-registro");
    function limparImpressao() {
      document.body.classList.remove("imprimindo-registro");
      window.removeEventListener("afterprint", limparImpressao);
    }
    window.addEventListener("afterprint", limparImpressao);
    window.print();
  }

  function baixarRegistroDocx(titulo, idiomas, linhas) {
    function esc(s) {
      return String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
    }
    function celula(texto, negrito, fundo) {
      var tcpr = fundo ? '<w:shd w:val="clear" w:color="auto" w:fill="' + fundo + '"/>' : "";
      return "<w:tc><w:tcPr>" + tcpr + "</w:tcPr><w:p>" + (texto ?
        "<w:r><w:rPr>" + (negrito ? "<w:b/>" : "") + '<w:sz w:val="20"/></w:rPr><w:t xml:space="preserve">' +
        esc(texto) + "</w:t></w:r>" : "") + "</w:p></w:tc>";
    }
    var cab = ["Item da auditoria"].concat(idiomas, ["Observações"]);
    var xml = '<w:tr><w:trPr><w:tblHeader/></w:trPr>' +
      cab.map(function (c) { return celula(c, true, "D9E2F3"); }).join("") + "</w:tr>";
    linhas.forEach(function (tr) {
      var cels = celula(tr.dataset.item, true);
      tr.querySelectorAll("select").forEach(function (s) { cels += celula(s.value || "—"); });
      cels += celula(tr.querySelector(".obs").value);
      xml += "<w:tr>" + cels + "</w:tr>";
    });
    var bordas = ["top", "left", "bottom", "right", "insideH", "insideV"].map(function (b) {
      return "<w:" + b + ' w:val="single" w:sz="4" w:space="0" w:color="808080"/>';
    }).join("");
    var hoje = new Date().toLocaleDateString("pt-BR");
    function par(texto, extra) {
      return '<w:p><w:pPr><w:spacing w:after="120"/></w:pPr><w:r><w:rPr>' + (extra || "") +
        '</w:rPr><w:t xml:space="preserve">' + esc(texto) + "</w:t></w:r></w:p>";
    }
    var corpo = par(titulo, '<w:b/><w:sz w:val="32"/>') +
      par("Curso OJS 3.5 para a equipe da Revista Crivo · Unidade 3 · Registro baixado em " + hoje) +
      par("Conferido: já estava certo. Ajustado: alterado e verificado no site. Pendente: depende de conteúdo, acesso ou decisão da equipe.") +
      '<w:tbl><w:tblPr><w:tblW w:w="5000" w:type="pct"/><w:tblBorders>' + bordas + "</w:tblBorders></w:tblPr>" + xml + "</w:tbl>" +
      '<w:sectPr><w:pgSz w:w="16838" w:h="11906" w:orient="landscape"/>' +
      '<w:pgMar w:top="1134" w:right="1134" w:bottom="1134" w:left="1134" w:header="0" w:footer="0" w:gutter="0"/></w:sectPr>';
    var documento = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
      '<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:body>' + corpo + "</w:body></w:document>";
    var tipos = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
      '<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">' +
      '<Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>' +
      '<Default Extension="xml" ContentType="application/xml"/>' +
      '<Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/></Types>';
    var rels = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
      '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">' +
      '<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/></Relationships>';
    var blob = zipar([["[Content_Types].xml", tipos], ["_rels/.rels", rels], ["word/document.xml", documento]]);
    var a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = "registro-auditoria-crivo-u3.docx";
    document.body.appendChild(a);
    a.click();
    setTimeout(function () { URL.revokeObjectURL(a.href); a.remove(); }, 1000);
  }

  function baixarDocx(titulo, colunas, linhas, comRespostas) {
    function esc(s) {
      return String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
    }
    function run(texto, negrito, simbolo) {
      var rpr = (negrito ? "<w:b/>" : "") +
        (simbolo ? '<w:rFonts w:ascii="Segoe UI Symbol" w:hAnsi="Segoe UI Symbol" w:cs="Segoe UI Symbol"/>' : "") +
        '<w:sz w:val="20"/>';
      return "<w:r><w:rPr>" + rpr + '</w:rPr><w:t xml:space="preserve">' + esc(texto) + "</w:t></w:r>";
    }
    function celula(texto, opcoes) {
      opcoes = opcoes || {};
      var tcpr = opcoes.mescla ? '<w:vMerge w:val="' + opcoes.mescla + '"/>' : (opcoes.continua ? "<w:vMerge/>" : "");
      if (opcoes.fundo) tcpr += '<w:shd w:val="clear" w:color="auto" w:fill="' + opcoes.fundo + '"/>';
      var jc = opcoes.centro ? '<w:jc w:val="center"/>' : "";
      return "<w:tc><w:tcPr>" + tcpr + "</w:tcPr><w:p><w:pPr>" + jc + "</w:pPr>" +
        (texto ? run(texto, opcoes.negrito, opcoes.simbolo) : "") + "</w:p></w:tc>";
    }
    var cab = ["Item", "Idioma"].concat(colunas, ["Situação", "Observações"]);
    var linhasXml = '<w:tr><w:trPr><w:tblHeader/></w:trPr>' +
      cab.map(function (c) { return celula(c, { negrito: true, fundo: "D9E2F3" }); }).join("") + "</w:tr>";
    var anterior = null, grupoAnterior = null;
    linhas.forEach(function (tr) {
      var caixas = tr.querySelectorAll("input[type=checkbox]");
      var item = tr.dataset.item;
      var grupo = tr.dataset.grupo || "";
      if (grupo && grupo !== grupoAnterior) {
        linhasXml += '<w:tr><w:tc><w:tcPr><w:gridSpan w:val="' + cab.length + '"/>' +
          '<w:shd w:val="clear" w:color="auto" w:fill="0B4F8A"/></w:tcPr><w:p>' +
          '<w:r><w:rPr><w:b/><w:color w:val="FFFFFF"/><w:sz w:val="20"/></w:rPr><w:t xml:space="preserve">' +
          esc(grupo) + "</w:t></w:r></w:p></w:tc></w:tr>";
        anterior = null;
      }
      grupoAnterior = grupo;
      var cels = celula(item, item === anterior ? { continua: true } : { mescla: "restart", negrito: true });
      anterior = item;
      cels += celula(tr.dataset.idioma);
      caixas.forEach(function (c) {
        var marcado = comRespostas && tr.dataset.tocada === "1" && c.checked;
        cels += celula(marcado ? "☒" : "☐", { simbolo: true, centro: true });
      });
      cels += celula(comRespostas ? tr.querySelector(".situacao").textContent : "");
      cels += celula(comRespostas ? tr.querySelector(".obs").value : "");
      linhasXml += "<w:tr>" + cels + "</w:tr>";
    });
    var bordas = ["top", "left", "bottom", "right", "insideH", "insideV"].map(function (b) {
      return "<w:" + b + ' w:val="single" w:sz="4" w:space="0" w:color="808080"/>';
    }).join("");
    var hoje = new Date().toLocaleDateString("pt-BR");
    var corpo =
      '<w:p><w:pPr><w:spacing w:after="120"/></w:pPr><w:r><w:rPr><w:b/><w:sz w:val="32"/></w:rPr><w:t xml:space="preserve">' +
      esc(titulo) + "</w:t></w:r></w:p>" +
      '<w:p><w:pPr><w:spacing w:after="120"/></w:pPr>' +
      run("Curso OJS 3.5 para a equipe da Revista Crivo · Unidade 2 · " + (comRespostas ? "Respostas baixadas em " + hoje : "Tabela em branco")) + "</w:p>" +
      '<w:p><w:pPr><w:spacing w:after="200"/></w:pPr>' +
      run("Marque o que existe em cada site. Situação: Completo, Falta no treinamento, Só no treinamento ou Não encontrado.") + "</w:p>" +
      '<w:tbl><w:tblPr><w:tblW w:w="5000" w:type="pct"/><w:tblBorders>' + bordas + "</w:tblBorders>" +
      '<w:tblLayout w:type="autofit"/></w:tblPr>' + linhasXml + "</w:tbl>" +
      '<w:sectPr><w:pgSz w:w="16838" w:h="11906" w:orient="landscape"/>' +
      '<w:pgMar w:top="1134" w:right="1134" w:bottom="1134" w:left="1134" w:header="0" w:footer="0" w:gutter="0"/></w:sectPr>';
    var documento = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
      '<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:body>' + corpo + "</w:body></w:document>";
    var tipos = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
      '<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">' +
      '<Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>' +
      '<Default Extension="xml" ContentType="application/xml"/>' +
      '<Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/></Types>';
    var rels = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
      '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">' +
      '<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/></Relationships>';
    var blob = zipar([["[Content_Types].xml", tipos], ["_rels/.rels", rels], ["word/document.xml", documento]]);
    var nome = comRespostas ? "comparacao-crivo-minhas-respostas.docx" : "comparacao-crivo-em-branco.docx";
    var a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = nome;
    document.body.appendChild(a);
    a.click();
    setTimeout(function () { URL.revokeObjectURL(a.href); a.remove(); }, 1000);
  }

  // ZIP sem compressão, suficiente para um .docx simples.
  var tabelaCrc = null;
  function crc32(bytes) {
    if (!tabelaCrc) {
      tabelaCrc = [];
      for (var n = 0; n < 256; n++) {
        var c = n;
        for (var k = 0; k < 8; k++) c = c & 1 ? 0xEDB88320 ^ (c >>> 1) : c >>> 1;
        tabelaCrc[n] = c >>> 0;
      }
    }
    var crc = 0xFFFFFFFF;
    for (var i = 0; i < bytes.length; i++) crc = tabelaCrc[(crc ^ bytes[i]) & 0xFF] ^ (crc >>> 8);
    return (crc ^ 0xFFFFFFFF) >>> 0;
  }
  function zipar(arquivos) {
    var enc = new TextEncoder();
    var partes = [], central = [], deslocamento = 0;
    function u16(v) { return [v & 0xFF, (v >>> 8) & 0xFF]; }
    function u32(v) { return [v & 0xFF, (v >>> 8) & 0xFF, (v >>> 16) & 0xFF, (v >>> 24) & 0xFF]; }
    arquivos.forEach(function (arq) {
      var nome = enc.encode(arq[0]), dados = enc.encode(arq[1]), crc = crc32(dados);
      var local = [].concat(u32(0x04034b50), u16(20), u16(0x0800), u16(0), u16(0), u16(0x21),
        u32(crc), u32(dados.length), u32(dados.length), u16(nome.length), u16(0));
      partes.push(new Uint8Array(local), nome, dados);
      central.push(new Uint8Array([].concat(u32(0x02014b50), u16(20), u16(20), u16(0x0800), u16(0), u16(0), u16(0x21),
        u32(crc), u32(dados.length), u32(dados.length), u16(nome.length), u16(0), u16(0), u16(0), u16(0), u32(0),
        u32(deslocamento))), nome);
      deslocamento += local.length + nome.length + dados.length;
    });
    var tamCentral = central.reduce(function (s, p) { return s + p.length; }, 0);
    var fim = new Uint8Array([].concat(u32(0x06054b50), u16(0), u16(0), u16(arquivos.length), u16(arquivos.length),
      u32(tamCentral), u32(deslocamento), u16(0)));
    return new Blob(partes.concat(central, [fim]), {
      type: "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
    });
  }

  // Restrição branda da prática: lembra de passar pelo caso de abertura.
  var aviso = document.querySelector(".aviso-restricao");
  if (aviso && !ler(VISTAS)["u01-01"]) aviso.hidden = false;

  // Questionários
  var quiz = document.querySelector(".questionario");
  if (quiz) {
    var questoes = quiz.querySelectorAll(".questao");
    var resultado = quiz.querySelector(".resultado");
    function placar() {
      var resp = 0, certas = 0;
      questoes.forEach(function (q) {
        if (q.dataset.resposta) { resp++; if (q.dataset.resposta === "1") certas++; }
      });
      if (resp === questoes.length) {
        var msg = certas === questoes.length ? resultado.dataset.ok : resultado.dataset.parcial;
        resultado.textContent = "Você acertou " + certas + " de " + questoes.length + ". " + msg;
        concluir(atividade);
      }
    }
    questoes.forEach(function (q) {
      var botao = q.querySelector(".verificar");
      var ret = q.querySelector(".retorno");
      botao.addEventListener("click", function () {
        var marcada = q.querySelector("input:checked");
        if (!marcada) { ret.className = "retorno errado"; ret.textContent = "Escolha uma opção antes de verificar."; return; }
        var certa = marcada.dataset.certa === "1";
        ret.className = "retorno " + (certa ? "certo" : "errado");
        ret.textContent = marcada.dataset.retorno;
        if (!q.dataset.resposta) q.dataset.resposta = certa ? "1" : "0";
        placar();
      });
    });
    quiz.querySelector(".refazer").addEventListener("click", function () {
      questoes.forEach(function (q) {
        delete q.dataset.resposta;
        q.querySelectorAll("input").forEach(function (i) { i.checked = false; });
        var r = q.querySelector(".retorno"); r.textContent = ""; r.className = "retorno";
      });
      resultado.textContent = "";
      questoes[0].querySelector("input").focus();
    });
  }

  // Lição
  var licao = document.querySelector(".licao");
  if (licao) {
    var paginas = licao.querySelectorAll(".pagina-licao");
    var prog = licao.querySelector(".progresso-licao");
    var primeira = {};   // pergunta -> acertou na primeira tentativa?
    function mostrar(num) {
      paginas.forEach(function (p) { p.hidden = p.dataset.pagina !== String(num); });
      var atual = licao.querySelector('.pagina-licao[data-pagina="' + num + '"]');
      var n = paginas.length - 1;
      prog.textContent = num === "fim" ? "" : "Página " + num + " de " + n;
      if (num === "fim") {
        var pl = atual.querySelector(".placar");
        var acertos = Object.keys(primeira).filter(function (k) { return primeira[k]; }).length;
        pl.textContent = "Você acertou " + acertos + " de " + pl.dataset.total + " decisões na primeira tentativa.";
        concluir(atividade);
      }
      var h = atual.querySelector("h2"); if (h) h.focus();
    }
    paginas.forEach(function (p) {
      var ret = p.querySelector(".retorno");
      var seguir = p.querySelector(".seguir");
      p.querySelectorAll(".opcao").forEach(function (b) {
        b.addEventListener("click", function () {
          var certa = b.dataset.pontos === "1";
          if (!(p.dataset.pagina in primeira)) primeira[p.dataset.pagina] = certa;
          p.querySelectorAll(".opcao").forEach(function (o) { o.setAttribute("aria-pressed", o === b ? "true" : "false"); });
          ret.className = "retorno " + (certa ? "certo" : "errado");
          ret.textContent = b.dataset.retorno + (certa ? "" : " Escolha outra opção.");
          if (b.dataset.vai !== "mesma") { seguir.hidden = false; seguir.dataset.vai = b.dataset.vai; seguir.focus(); }
          else seguir.hidden = true;
        });
      });
      if (seguir) seguir.addEventListener("click", function () {
        if (seguir.dataset.vai) mostrar(seguir.dataset.vai);
      });
      var av = p.querySelector(".avancar");
      if (av) av.addEventListener("click", function () { mostrar(av.dataset.vai); });
    });
    var rec = licao.querySelector(".recomecar");
    rec.addEventListener("click", function () {
      primeira = {};
      paginas.forEach(function (p) {
        var r = p.querySelector(".retorno"); if (r) { r.textContent = ""; r.className = "retorno"; }
        var s = p.querySelector(".seguir"); if (s) s.hidden = true;
        p.querySelectorAll(".opcao").forEach(function (o) { o.removeAttribute("aria-pressed"); });
      });
      mostrar(1);
    });
    prog.textContent = "Página 1 de " + (paginas.length - 1);
  }
})();
