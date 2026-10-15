import { isSupabaseConfigured, supabase } from "./supabase.js";
console.log("VERSAO NOVA 15/10");
const form = document.querySelector("#movement-form");
const itemForm = document.querySelector("#item-form");
const itemSelect = document.querySelector("#movement-item");
const itemDescriptionInput = document.querySelector("#item-description");
const itemUnitInput = document.getElementById("item-unit");
const itemSubmitButton = document.querySelector("#item-submit-button");
const itemMessage = document.querySelector("#item-message");
const itemDashboards = document.querySelector("#item-dashboards");
const openEntryDialogButton = document.querySelector("#open-entry-dialog");
const entryDialog = document.querySelector("#entry-dialog");
const entryForm = document.querySelector("#entry-dialog-form");
const entryItemSelect = document.querySelector("#entry-item");
const entryCurrentBalance = document.querySelector("#entry-current-balance");
const entryQuantityInput = document.querySelector("#entry-quantity");
const entryDateInput = document.querySelector("#entry-date");
const entryNameInput = document.querySelector("#entry-name");
const entryMessage = document.querySelector("#entry-message");
const entrySubmitButton = document.querySelector("#entry-submit-button");
const entryFields = [...entryForm.querySelectorAll("input, select")];
const typeInput = document.querySelector("#movement-type");
const quantityInput = document.querySelector("#quantity");
const dateInput = document.querySelector("#movement-date");
const departmentInput = document.querySelector("#department");
const nameInput = document.querySelector("#person-name");
const departmentRequired = document.querySelector("#department-required");
const submitButton = document.querySelector("#submit-button");
const formMessage = document.querySelector("#form-message");
const activityList = document.querySelector("#activity-list");
const connectionDot = document.querySelector("#connection-dot");
const connectionLabel = document.querySelector("#connection-label");
const fields = [...form.querySelectorAll("input, select")];
let isSavingMovement = false;
let isSavingItem = false;
let itemSummaries = [];

const today = new Date();
const localDate = new Date(today.getTime() - today.getTimezoneOffset() * 60000)
  .toISOString()
  .slice(0, 10);
dateInput.value = localDate;
document.querySelector("#today-label").textContent = new Intl.DateTimeFormat("pt-BR", {
  dateStyle: "full",
}).format(today);

function setConnection(connected, label) {
  connectionDot.className = `connection-dot ${connected ? "connected" : "disconnected"}`;
  connectionLabel.textContent = label;
}

function showMessage(message, type) {
  formMessage.textContent = message;
  formMessage.className = `form-message ${type}`;
  formMessage.hidden = false;
}

function hideMessage() {
  formMessage.hidden = true;
  formMessage.textContent = "";
}

function formatQuantity(value) {
  return new Intl.NumberFormat("pt-BR").format(Number(value));
}

function formatDate(value) {
  const date = new Date(`${value}T12:00:00`);
  return new Intl.DateTimeFormat("pt-BR", { dateStyle: "short" }).format(date);
}

function renderItemDashboards(summaries) {
  itemDashboards.replaceChildren();
  if (summaries.length === 0) {
    const empty = document.createElement("p");
    empty.className = "table-state dashboard-state";
    empty.textContent = "Cadastre um item para visualizar o painel do estoque.";
    itemDashboards.append(empty);
    return;
  }

  for (const summary of summaries) {
    console.log(summary);
    const card = document.createElement("article");
    card.className = "item-dashboard-card";
    const heading = document.createElement("div");
    heading.className = "item-dashboard-heading";
    const title = document.createElement("h2");
    title.textContent = summary.descricao;
    const icon = document.createElement("span");
    icon.className = "summary-icon balance-icon";
    icon.setAttribute("aria-hidden", "true");
    icon.textContent = "▤";
    heading.append(title, icon);
    card.append(heading);

    const metrics = document.createElement("div");
    metrics.className = "item-dashboard-metrics";
    const values = [
      ["Saldo disponível", summary.saldo_atual, "balance"],
      ["Total de entradas", summary.total_entradas, "entry"],
      ["Total de saídas", summary.total_saidas, "exit"],
    ];
    for (const [label, value, kind] of values) {
      const metric = document.createElement("div");
      metric.className = `item-metric ${kind}`;
      const metricLabel = document.createElement("span");
      metricLabel.className = "summary-label";
      metricLabel.textContent = label;
      const metricValue = document.createElement("strong");
      metricValue.textContent = formatQuantity(value);
      const unit = document.createElement("span");
      unit.className = "summary-unit";
      unit.textContent = summary.unidade_medida;
      const number = document.createElement("div");
      number.className = "item-metric-value";
      number.append(metricValue, unit);
      metric.append(metricLabel, number);
      metrics.append(metric);
    }
    card.append(metrics);
    itemDashboards.append(card);
  }
}

function updateMovementAvailability() {
  const isSaving = isSavingMovement || isSavingItem;
  const hasItems = itemSelect.options.length > 0 && itemSelect.value !== "";
  itemSelect.disabled = !supabase || isSaving || itemSelect.options.length === 0;
  for (const field of fields) field.disabled = !supabase || isSaving || !hasItems;
  submitButton.disabled = !supabase || isSaving || !hasItems;
  itemDescriptionInput.disabled = !supabase || isSaving;
  itemSubmitButton.disabled = !supabase || isSaving;
  openEntryDialogButton.disabled = !supabase || isSaving || !hasItems;
  entryFields.forEach((field) => { field.disabled = !supabase || isSaving || !hasItems; });
  entrySubmitButton.disabled = !supabase || isSaving || !hasItems;
}

function appendCell(row, className, content) {
  const cell = document.createElement("td");
  if (className) cell.className = className;
  if (content instanceof Node) cell.append(content);
  else cell.textContent = content;
  row.append(cell);
  return cell;
}

function renderActivities(movements) {
  activityList.replaceChildren();
  if (movements.length === 0) {
    const row = document.createElement("tr");
    const cell = appendCell(row, "table-state", "Nenhuma movimentação registrada ainda.");
    cell.colSpan = 4;
    activityList.append(row);
    return;
  }

  for (const movement of movements) {
    const isEntry = movement.tipo === "entrada";
    const row = document.createElement("tr");
    const movementCell = document.createElement("td");
    const type = document.createElement("div");
    type.className = "movement-type";
    const badge = document.createElement("span");
    badge.className = `movement-badge ${isEntry ? "entry" : "exit"}`;
    badge.setAttribute("aria-hidden", "true");
    badge.textContent = isEntry ? "↙" : "↗";
    const titleWrap = document.createElement("span");
    const title = document.createElement("span");
    title.className = "movement-title";
    title.textContent = isEntry ? "Entrada" : "Retirada";
    const date = document.createElement("span");
    date.className = "movement-date";
    date.textContent = formatDate(movement.data_movimento);
    titleWrap.append(title, date);
    type.append(badge, titleWrap);
    movementCell.append(type);
    row.append(movementCell);

    appendCell(row, "activity-item", movement.item?.descricao ?? "Item não informado");
    const details = document.createElement("div");
    details.className = "activity-details";
    const person = document.createElement("strong");
    person.textContent = movement.nome;
    details.append(person);
    const department = document.createElement("span");
    department.textContent = movement.setor || "Setor não informado";
    details.append(department);
    appendCell(row, "", details);
    console.log(movement.item);
    const unidade = {
      pacote: "pac.",
      unidade: "un.",
      kg: "kg"
    };

    appendCell(row, `quantity-cell ${isEntry ? "entry" : "exit"}`, `${isEntry ? "+" : "−"}${formatQuantity(movement.quantidade)} ${unidade[movement.item?.unidade_medida] ?? movement.item?.unidade_medida ?? ""}`);
    activityList.append(row);
  }
}

async function loadDashboard() {
  if (!supabase) return;
  const [itemsResult, summaryResult, activityResult] = await Promise.all([
    supabase.from("itens_estoque").select("id, descricao").order("descricao"),
    supabase.rpc("resumo_estoque"),
    supabase
      .from("movimentacoes_estoque")
      .select("id, tipo, quantidade, setor, nome, data_movimento, item:itens_estoque(descricao, unidade_medida)")
      .order("data_movimento", { ascending: false })
      .order("created_at", { ascending: false })
      .limit(10),
  ]);

  if (itemsResult.error) throw new Error(`Não foi possível carregar os itens: ${itemsResult.error.message}`);
  if (summaryResult.error) throw new Error(`Não foi possível carregar o saldo: ${summaryResult.error.message}`);
  if (activityResult.error) throw new Error(`Não foi possível carregar as atividades: ${activityResult.error.message}`);

  const selectedItemId = itemSelect.value;
  itemSelect.replaceChildren();
  for (const item of itemsResult.data) {
    const option = document.createElement("option");
    option.value = item.id;
    option.textContent = item.descricao;
    itemSelect.append(option);
  }
  if (itemsResult.data.some((item) => item.id === selectedItemId)) itemSelect.value = selectedItemId;
  if (itemsResult.data.length === 0) {
    const option = document.createElement("option");
    option.value = "";
    option.textContent = "Cadastre um item para começar";
    itemSelect.append(option);
  }

  itemSummaries = summaryResult.data ?? [];
  renderItemDashboards(itemSummaries);
  syncEntryItems(itemsResult.data);
  renderActivities(activityResult.data ?? []);
  updateMovementAvailability();
  setConnection(true, "Conectado ao Supabase");
}

function syncEntryItems(items) {
  const selectedEntryItemId = entryItemSelect.value;
  entryItemSelect.replaceChildren();
  for (const item of items) {
    const option = document.createElement("option");
    option.value = item.id;
    option.textContent = item.descricao;
    entryItemSelect.append(option);
  }
  if (items.some((item) => item.id === selectedEntryItemId)) entryItemSelect.value = selectedEntryItemId;
  else if (itemSelect.value) entryItemSelect.value = itemSelect.value;
  updateEntryBalance();
}

function updateEntryBalance() {
  const selectedSummary = itemSummaries.find(
  (summary) => String(summary.item_id) === entryItemSelect.value
);
  entryCurrentBalance.textContent =`${formatQuantity(selectedSummary?.saldo_atual ?? 0)} ${selectedSummary?.unidade_medida ?? ""}`;
}

function setEntryMessage(message, type) {
  entryMessage.textContent = message;
  entryMessage.className = `form-message ${type}`;
  entryMessage.hidden = false;
}

function clearEntryMessage() {
  entryMessage.textContent = "";
  entryMessage.hidden = true;
}

function updateMovementForm() {
  const isExit = typeInput.value === "saida";
  submitButton.innerHTML = `<span aria-hidden="true">${isExit ? "−" : "+"}</span> Registrar ${isExit ? "retirada" : "entrada"}`;
  departmentInput.required = isExit;
  departmentRequired.hidden = !isExit;
  departmentInput.placeholder = isExit ? "Ex.: Produção" : "Opcional para entrada";
}

itemForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  itemMessage.hidden = true;
  if (!itemForm.reportValidity()) return;
  if (!supabase) {
    itemMessage.textContent = "Configure a conexão com o Supabase antes de cadastrar itens.";
    itemMessage.className = "form-message error";
    itemMessage.hidden = false;
    return;
  }

  isSavingItem = true;
  updateMovementAvailability();
  itemSubmitButton.textContent = "Cadastrando...";
  try {
    const { error } = await supabase.rpc("criar_item", {
      p_descricao: itemDescriptionInput.value.trim(),
      p_unidade_medida: itemUnitInput.value,
    });
    if (error) throw new Error(error.message);
    itemForm.reset();
    itemMessage.textContent = "Item cadastrado com sucesso.";
    itemMessage.className = "form-message success";
    itemMessage.hidden = false;
    try {
      await loadDashboard();
    } catch (refreshError) {
      const message = refreshError instanceof Error ? refreshError.message : "erro inesperado ao atualizar os paineis";
      setConnection(false, "Erro de conexão");
      itemMessage.textContent = `Item cadastrado, mas não foi possível atualizar os painéis: ${message}`;
      itemMessage.className = "form-message error";
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : "Erro inesperado ao cadastrar o item.";
    itemMessage.textContent = message;
    itemMessage.className = "form-message error";
    itemMessage.hidden = false;
  } finally {
    isSavingItem = false;
    updateMovementAvailability();
    itemSubmitButton.innerHTML = "<span aria-hidden=\"true\">＋</span> Cadastrar item";
  }
});

openEntryDialogButton.addEventListener("click", () => {
  clearEntryMessage();
  entryForm.reset();
  entryDateInput.value = localDate;
  if (itemSelect.value) entryItemSelect.value = itemSelect.value;
  updateEntryBalance();
  entryDialog.showModal();
  entryQuantityInput.focus();
});

document.querySelector("#close-entry-dialog").addEventListener("click", () => entryDialog.close());
document.querySelector("#cancel-entry-dialog").addEventListener("click", () => entryDialog.close());
entryDialog.addEventListener("click", (event) => {
  if (event.target === entryDialog) entryDialog.close();
});
entryItemSelect.addEventListener("change", updateEntryBalance);
entryForm.addEventListener("input", clearEntryMessage);
entryForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  clearEntryMessage();
  if (!entryForm.reportValidity()) return;
  const quantity = Number(entryQuantityInput.value);
  const name = entryNameInput.value.trim();
  if (!Number.isSafeInteger(quantity) || quantity <= 0) {
    setEntryMessage("Informe uma quantidade válida de pacotes (número inteiro maior que zero).", "error");
    return;
  }
  if (!name) {
    setEntryMessage("Informe o nome de quem está registrando a entrada.", "error");
    entryNameInput.focus();
    return;
  }

  isSavingMovement = true;
  updateMovementAvailability();
  entrySubmitButton.textContent = "Registrando...";
  try {
    const { error } = await supabase.rpc("registrar_movimentacao", {
      p_item_id: entryItemSelect.value,
      p_tipo: "entrada",
      p_quantidade: quantity,
      p_setor: null,
      p_nome: name,
      p_data: entryDateInput.value,
    });
    if (error) throw new Error(error.message);
    entryDialog.close();
    entryForm.reset();
    entryDateInput.value = localDate;
    showMessage("Entrada registrada com sucesso.", "success");
    try {
      await loadDashboard();
    } catch (refreshError) {
      const message = refreshError instanceof Error ? refreshError.message : "erro inesperado ao atualizar o painel";
      setConnection(false, "Erro de conexão");
      showMessage(`Entrada registrada, mas não foi possível atualizar o painel: ${message}`, "error");
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : "Erro inesperado ao registrar a entrada.";
    setEntryMessage(message, "error");
  } finally {
    isSavingMovement = false;
    updateMovementAvailability();
    entrySubmitButton.innerHTML = "<span aria-hidden=\"true\">＋</span> Confirmar entrada";
  }
});

typeInput.addEventListener("change", updateMovementForm);
itemSelect.addEventListener("change", () => {
  hideMessage();
  entryItemSelect.value = itemSelect.value;
  updateEntryBalance();
});
form.addEventListener("input", hideMessage);
form.addEventListener("submit", async (event) => {
  event.preventDefault();
  hideMessage();
  if (!form.reportValidity()) return;
  if (!supabase) {
    showMessage("Configure a URL e a chave publishable/anon do Supabase no arquivo supabase.js para registrar movimentações.", "error");
    return;
  }

  const movement = {
    p_item_id: itemSelect.value,
    p_tipo: typeInput.value,
    p_quantidade: Number(quantityInput.value),
    p_setor: departmentInput.value.trim() || null,
    p_nome: nameInput.value.trim(),
    p_data: dateInput.value,
  };
  if (!Number.isSafeInteger(movement.p_quantidade) || movement.p_quantidade <= 0) {
    showMessage("Informe uma quantidade válida de pacotes (número inteiro maior que zero).", "error");
    return;
  }
  if (!movement.p_nome) {
    showMessage("Informe o nome de quem está registrando a movimentação.", "error");
    nameInput.focus();
    return;
  }
  if (movement.p_tipo === "saida" && !movement.p_setor) {
    showMessage("Informe o setor que receberá os pacotes.", "error");
    departmentInput.focus();
    return;
  }

  submitButton.disabled = true;
  submitButton.textContent = "Registrando...";
  isSavingMovement = true;
  updateMovementAvailability();
  try {
    const { error } = await supabase.rpc("registrar_movimentacao", movement);
    if (error) throw new Error(error.message);
    form.reset();
    dateInput.value = localDate;
    updateMovementForm();
    showMessage("Movimentação registrada com sucesso.", "success");
    quantityInput.focus();
    try {
      await loadDashboard();
    } catch (refreshError) {
      const message = refreshError instanceof Error ? refreshError.message : "erro inesperado ao atualizar o painel";
      setConnection(false, "Erro de conexão");
      showMessage(`Movimentação registrada, mas não foi possível atualizar o painel: ${message}`, "error");
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : "Erro inesperado ao registrar a movimentação.";
    showMessage(message, "error");
    if (message.toLowerCase().includes("saldo insuficiente")) {
      await loadDashboard().catch((refreshError) => {
        showMessage(`${message} Não foi possível atualizar o saldo: ${refreshError.message}`, "error");
      });
    }
  } finally {
    isSavingMovement = false;
    updateMovementAvailability();
    updateMovementForm();
  }
});

document.querySelector("#refresh-button").addEventListener("click", async () => {
  if (!supabase) return;
  try {
    await loadDashboard();
  } catch (error) {
    const message = error instanceof Error ? error.message : "Erro inesperado ao atualizar o painel.";
    setConnection(false, "Erro de conexão");
    showMessage(message, "error");
  }
});

updateMovementForm();
if (!isSupabaseConfigured) {
  setConnection(false, "Configure o Supabase");
  itemDashboards.replaceChildren();
  renderActivities([]);
  showMessage("Para começar, configure o Supabase em supabase.js e execute supabase-schema.sql no editor SQL do seu projeto.", "error");
  updateMovementAvailability();
} else {
  loadDashboard().catch((error) => {
    const message = error instanceof Error ? error.message : "Erro inesperado ao conectar ao Supabase.";
    setConnection(false, "Erro de conexão");
    showMessage(message, "error");
    const row = document.createElement("tr");
    const cell = appendCell(row, "table-state", "Não foi possível carregar as atividades.");
    cell.colSpan = 4;
    activityList.replaceChildren(row);
  });
}
