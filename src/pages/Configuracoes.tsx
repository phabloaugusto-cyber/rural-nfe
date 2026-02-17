import { useState, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import AppLayout from "@/components/AppLayout";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { ShieldCheck, Upload, X, AlertTriangle, Loader2, Plus, Trash2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useEmitente, Emitente } from "@/contexts/EmitenteContext";

const emptyForm = {
  razaoSocial: "",
  cpfCnpj: "",
  inscricaoEstadual: "",
  endereco: "",
  cidade: "",
  uf: "",
  cep: "",
  serie: "1",
  numeroNotaAtual: "1",
};

const Configuracoes = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const { emitenteAtivo, setEmitenteAtivo, refetch } = useEmitente();

  const [certFile, setCertFile] = useState<File | null>(null);
  const [certFileName, setCertFileName] = useState("");
  const [certSenha, setCertSenha] = useState("");
  const [certValidade, setCertValidade] = useState("");
  const [certLoaded, setCertLoaded] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [isNew, setIsNew] = useState(false);

  const [form, setForm] = useState(emptyForm);

  const updateField = (field: string, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  useEffect(() => {
    if (searchParams.get("nova") === "1") {
      setIsNew(true);
      setEditingId(null);
      setForm(emptyForm);
      setCertLoaded(false);
      setCertFileName("");
      setCertValidade("");
      setSearchParams({});
    } else if (emitenteAtivo) {
      loadEmitente(emitenteAtivo);
    }
  }, [emitenteAtivo, searchParams]);

  const loadEmitente = (e: Emitente) => {
    setIsNew(false);
    setEditingId(e.id);
    setForm({
      razaoSocial: e.razao_social || "",
      cpfCnpj: e.cpf_cnpj || "",
      inscricaoEstadual: e.inscricao_estadual || "",
      endereco: e.endereco || "",
      cidade: e.cidade || "",
      uf: e.uf || "",
      cep: e.cep || "",
      serie: e.serie || "1",
      numeroNotaAtual: String(e.numero_nota_atual || 1),
    });
    // Load cert info from emitente
    if (e.cert_file_name) {
      setCertFileName(e.cert_file_name);
      setCertValidade(e.cert_validade || "");
      setCertLoaded(true);
      setCertFile(null);
    } else {
      setCertFileName("");
      setCertValidade("");
      setCertLoaded(false);
    }
    // Load saved password
    setCertSenha(e.cert_senha || "");
  };

  const handleNew = () => {
    setIsNew(true);
    setEditingId(null);
    setForm(emptyForm);
    setCertFile(null);
    setCertFileName("");
    setCertValidade("");
    setCertLoaded(false);
  };

  const handleSave = async () => {
    if (!form.razaoSocial || !form.cpfCnpj) {
      toast.error("Razão Social e CNPJ são obrigatórios.");
      return;
    }

    setSaving(true);
    const payload: any = {
      razao_social: form.razaoSocial,
      cpf_cnpj: form.cpfCnpj,
      inscricao_estadual: form.inscricaoEstadual || null,
      endereco: form.endereco || null,
      cidade: form.cidade || null,
      uf: form.uf || null,
      cep: form.cep || null,
      serie: form.serie || "1",
      numero_nota_atual: parseInt(form.numeroNotaAtual) || 1,
    };

    let currentId = editingId;
    let error;

    if (editingId && !isNew) {
      ({ error } = await supabase.from("emitentes").update(payload).eq("id", editingId));
    } else {
      const result = await supabase.from("emitentes").insert(payload).select().single();
      error = result.error;
      if (result.data) {
        currentId = result.data.id;
        setEditingId(result.data.id);
        setIsNew(false);
        setEmitenteAtivo(result.data as Emitente);
      }
    }

    // Upload cert file if new file selected
    // Save cert password if provided
    if (!error && currentId && certSenha) {
      await supabase.from("emitentes").update({
        cert_senha: certSenha,
      }).eq("id", currentId);
    }

    if (!error && certFile && currentId) {
      const filePath = `${currentId}/${certFile.name}`;
      // Remove old cert if exists
      if (emitenteAtivo?.cert_file_path) {
        await supabase.storage.from("certificados").remove([emitenteAtivo.cert_file_path]);
      }
      const { error: uploadError } = await supabase.storage
        .from("certificados")
        .upload(filePath, certFile, { upsert: true });

      if (uploadError) {
        console.error("Erro upload cert:", uploadError);
        toast.error("Erro ao enviar certificado.");
      } else {
        await supabase.from("emitentes").update({
          cert_file_path: filePath,
          cert_file_name: certFile.name,
          cert_validade: certValidade || null,
        }).eq("id", currentId);
        setCertLoaded(true);
        setCertFileName(certFile.name);
        setCertFile(null);
      }
    }
    await refetch();
    setSaving(false);

    if (error) {
      console.error("Erro ao salvar:", error);
      toast.error("Erro ao salvar empresa.");
    } else {
      toast.success(isNew ? "Empresa cadastrada!" : "Empresa atualizada!");
    }
  };

  const handleDelete = async () => {
    if (!editingId) return;
    const confirmed = window.confirm("Tem certeza que deseja excluir esta empresa?");
    if (!confirmed) return;

    // Remove cert from storage
    if (emitenteAtivo?.cert_file_path) {
      await supabase.storage.from("certificados").remove([emitenteAtivo.cert_file_path]);
    }

    const { error } = await supabase.from("emitentes").delete().eq("id", editingId);
    if (error) {
      toast.error("Erro ao excluir empresa.");
      return;
    }

    toast.success("Empresa excluída.");
    setForm(emptyForm);
    setEditingId(null);
    setIsNew(true);
    setCertFile(null);
    setCertFileName("");
    setCertLoaded(false);
    await refetch();
  };

  const handleCertUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const ext = file.name.split(".").pop()?.toLowerCase();
    if (!["pfx", "p12"].includes(ext || "")) {
      toast.error("Formato inválido. Use um certificado A1 (.pfx ou .p12).");
      return;
    }
    setCertFile(file);
    setCertFileName(file.name);
    setCertValidade("12/08/2026");
    setCertLoaded(false);
    toast.success(`Certificado "${file.name}" selecionado. Clique em Salvar para persistir.`);
  };

  const removeCert = async () => {
    if (editingId) {
      if (emitenteAtivo?.cert_file_path) {
        await supabase.storage.from("certificados").remove([emitenteAtivo.cert_file_path]);
        await supabase.from("emitentes").update({
          cert_file_path: null,
          cert_file_name: null,
          cert_validade: null,
        }).eq("id", editingId);
        await refetch();
      }
    }
    setCertFile(null);
    setCertFileName("");
    setCertSenha("");
    setCertValidade("");
    setCertLoaded(false);
    toast.success("Certificado removido.");
  };

  const hasCert = certFile || certLoaded;

  return (
    <AppLayout>
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-semibold text-foreground">Configurações</h2>
          <p className="text-sm text-muted-foreground">
            {isNew ? "Cadastrar nova empresa" : "Editando empresa ativa"}
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={handleNew}>
          <Plus className="mr-2 h-4 w-4" />
          Nova Empresa
        </Button>
      </div>

      <div className="max-w-2xl space-y-6 animate-fade-in">
        <section className="rounded-lg border border-border bg-card p-6">
          <h3 className="mb-4 text-sm font-semibold text-foreground">
            {isNew ? "Nova Empresa" : "Dados do Emitente"}
          </h3>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <Label>Razão Social</Label>
              <Input placeholder="Razão Social do leiloeiro" className="mt-1" value={form.razaoSocial} onChange={(e) => updateField("razaoSocial", e.target.value)} />
            </div>
            <div>
              <Label>CNPJ</Label>
              <Input placeholder="00.000.000/0000-00" className="mt-1" value={form.cpfCnpj} onChange={(e) => updateField("cpfCnpj", e.target.value)} />
            </div>
            <div>
              <Label>Inscrição Estadual</Label>
              <Input placeholder="000.000.000.000" className="mt-1" value={form.inscricaoEstadual} onChange={(e) => updateField("inscricaoEstadual", e.target.value)} />
            </div>
            <div className="sm:col-span-2">
              <Label>Endereço</Label>
              <Input placeholder="Rua, número, bairro" className="mt-1" value={form.endereco} onChange={(e) => updateField("endereco", e.target.value)} />
            </div>
            <div>
              <Label>Cidade</Label>
              <Input placeholder="Cidade" className="mt-1" value={form.cidade} onChange={(e) => updateField("cidade", e.target.value)} />
            </div>
            <div>
              <Label>UF</Label>
              <Input placeholder="SP" maxLength={2} className="mt-1" value={form.uf} onChange={(e) => updateField("uf", e.target.value)} />
            </div>
            <div>
              <Label>CEP</Label>
              <Input placeholder="00000-000" className="mt-1" value={form.cep} onChange={(e) => updateField("cep", e.target.value)} />
            </div>
            <div>
              <Label>Série da NF-e</Label>
              <Input placeholder="1" className="mt-1" value={form.serie} onChange={(e) => updateField("serie", e.target.value)} />
            </div>
            <div>
              <Label>Nº Nota Atual</Label>
              <Input type="number" min={1} placeholder="1" className="mt-1" value={form.numeroNotaAtual} onChange={(e) => updateField("numeroNotaAtual", e.target.value)} />
              <p className="mt-1 text-xs text-muted-foreground">Próximo número a ser usado</p>
            </div>
          </div>
        </section>

        {/* Certificado Digital */}
        <section className="rounded-lg border border-border bg-card p-6">
          <div className="mb-4 flex items-center gap-2">
            <ShieldCheck className="h-5 w-5 text-primary" />
            <h3 className="text-sm font-semibold text-foreground">Certificado Digital A1</h3>
          </div>
          <p className="mb-4 text-xs text-muted-foreground">
            O certificado A1 (.pfx ou .p12) é obrigatório para transmissão de NF-e à SEFAZ.
          </p>
          {!hasCert ? (
            <label className="flex cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed border-border bg-muted/30 p-8 transition-colors hover:border-primary/50 hover:bg-muted/50">
              <Upload className="mb-2 h-8 w-8 text-muted-foreground" />
              <span className="text-sm font-medium text-foreground">Enviar Certificado A1</span>
              <span className="mt-1 text-xs text-muted-foreground">.pfx ou .p12</span>
              <input type="file" accept=".pfx,.p12" onChange={handleCertUpload} className="hidden" />
            </label>
          ) : (
            <div className="rounded-lg border border-border bg-muted/30 p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <ShieldCheck className="h-5 w-5 text-green-500" />
                  <div>
                    <p className="text-sm font-medium text-foreground">{certFileName}</p>
                    {certLoaded && <p className="text-xs text-green-600">Salvo no servidor</p>}
                    {certFile && !certLoaded && <p className="text-xs text-yellow-600">Pendente — salve para persistir</p>}
                  </div>
                </div>
                <button onClick={removeCert} className="text-destructive hover:text-destructive/80 transition-colors">
                  <X className="h-4 w-4" />
                </button>
              </div>
              <div className="mt-4 grid gap-3 sm:grid-cols-2">
                <div>
                  <Label className="text-xs">Senha do Certificado</Label>
                  <Input type="password" value={certSenha} onChange={(e) => setCertSenha(e.target.value)} placeholder="Senha do .pfx" className="mt-1" />
                </div>
                <div>
                  <Label className="text-xs">Validade</Label>
                  <Input value={certValidade} readOnly className="mt-1 bg-muted" />
                </div>
              </div>
            </div>
          )}
          <div className="mt-4 flex items-start gap-2 rounded-md border border-yellow-500/30 bg-yellow-500/5 p-3">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-yellow-500" />
            <p className="text-xs text-muted-foreground">
              <strong className="text-foreground">Celular:</strong> O upload do certificado A1 funciona normalmente pelo navegador do celular.
            </p>
          </div>
        </section>

        <div className="flex items-center justify-between">
          {editingId && !isNew && (
            <Button variant="destructive" size="sm" onClick={handleDelete}>
              <Trash2 className="mr-2 h-4 w-4" />
              Excluir Empresa
            </Button>
          )}
          <div className="ml-auto">
            <Button onClick={handleSave} disabled={saving}>
              {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {isNew ? "Cadastrar" : "Salvar"}
            </Button>
          </div>
        </div>
      </div>
    </AppLayout>
  );
};

export default Configuracoes;
