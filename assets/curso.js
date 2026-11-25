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
    painel.querySelector(".painel-corpo").innerHTML = d.h;
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
