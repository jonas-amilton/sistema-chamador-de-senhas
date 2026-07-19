import { Form, Head, Link } from '@inertiajs/react';
import {
    Building2,
    CheckCircle2,
    ChevronLeft,
    ChevronRight,
    CircleGauge,
    Clock3,
    History,
    MonitorCog,
    Power,
    PowerOff,
    Save,
    Settings2,
    Ticket as TicketIcon,
    UserPlus,
    Users,
    XCircle,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { useState } from 'react';
import InputError from '@/components/input-error';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import {
    Dialog,
    DialogClose,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Spinner } from '@/components/ui/spinner';
import admin from '@/routes/admin';
import type {
    Counter,
    Pagination,
    Service,
    Ticket,
    TicketPriority,
    TicketStatus,
    Unit,
    User,
} from '@/types';

type Metrics = {
    waiting_standard: number;
    waiting_priority: number;
    serving: number;
    completed: number;
    no_show: number;
    average_wait_seconds: number;
    average_service_seconds: number;
};

type FilterOption<T extends string> = {
    value: T;
    label: string;
};

type DashboardFilters = Partial<{
    unit_id: string;
    service_id: string;
    counter_id: string;
    status: TicketStatus;
    priority: TicketPriority;
    from: string;
    to: string;
    per_page: number;
    page: number;
}>;

type AdminService = Service & {
    unit?: Pick<Unit, 'id' | 'name'> | null;
};

type AdminCounter = Counter & {
    unit?: Pick<Unit, 'id' | 'name'> | null;
};

type AdminUser = Pick<
    User,
    'id' | 'unit_id' | 'name' | 'email' | 'role' | 'is_active'
> & {
    unit?: Pick<Unit, 'id' | 'name'> | null;
};

type Props = {
    metrics: Metrics;
    units: Unit[];
    services: AdminService[];
    counters: AdminCounter[];
    users: AdminUser[];
    tickets: Pagination<Ticket>;
    filters: DashboardFilters;
    selectedBusinessDate: string;
    statusOptions: FilterOption<TicketStatus>[];
    priorityOptions: FilterOption<TicketPriority>[];
};

type UnitForm = {
    name: string;
    slug: string;
    timezone: string;
    is_active?: string;
};

type ServiceForm = {
    unit_id: string;
    name: string;
    slug: string;
    standard_prefix: string;
    priority_prefix: string;
    priority_streak_limit: string;
    is_active?: string;
};

type CounterForm = {
    unit_id: string;
    name: string;
    code: string;
    service_ids: string[];
    is_active?: string;
};

type UserForm = {
    name: string;
    email: string;
    password: string;
    role: User['role'];
    unit_id?: string;
    is_active?: string;
};

type TicketFilterForm = {
    unit_id: string;
    service_id: string;
    counter_id: string;
    status: string;
    priority: string;
    from: string;
    to: string;
    per_page: string;
};

const selectClassName =
    'border-input bg-background focus-visible:border-ring focus-visible:ring-ring/50 h-9 w-full rounded-md border px-3 text-sm shadow-xs outline-none focus-visible:ring-[3px] disabled:cursor-not-allowed disabled:opacity-50';

function formatBusinessDate(value: string): string {
    const [year, month, day] = value.split('-');

    return year && month && day ? `${day}/${month}/${year}` : value;
}

function formatDateTime(value: string | null): string {
    if (!value) {
        return '—';
    }

    const date = new Date(value);

    if (Number.isNaN(date.getTime())) {
        return value;
    }

    return new Intl.DateTimeFormat('pt-BR', {
        dateStyle: 'short',
        timeStyle: 'short',
    }).format(date);
}

function formatDuration(seconds: number): string {
    const roundedSeconds = Math.max(0, Math.round(seconds));
    const minutes = Math.floor(roundedSeconds / 60);
    const remainder = roundedSeconds % 60;

    if (minutes === 0) {
        return `${remainder} s`;
    }

    return `${minutes} min ${remainder.toString().padStart(2, '0')} s`;
}

function statusVariant(
    status: TicketStatus,
): 'default' | 'secondary' | 'destructive' | 'outline' {
    if (status === 'completed') {
        return 'default';
    }

    if (status === 'no_show' || status === 'cancelled') {
        return 'destructive';
    }

    if (status === 'called' || status === 'serving') {
        return 'secondary';
    }

    return 'outline';
}

function MetricCard({
    label,
    value,
    detail,
    icon: Icon,
}: {
    label: string;
    value: string | number;
    detail: string;
    icon: LucideIcon;
}) {
    return (
        <Card className="gap-3 py-4">
            <CardHeader className="flex-row items-start justify-between gap-3 px-4">
                <div className="min-w-0 space-y-1">
                    <CardDescription>{label}</CardDescription>
                    <CardTitle className="text-2xl tabular-nums">
                        {value}
                    </CardTitle>
                </div>
                <span className="rounded-lg bg-muted p-2 text-muted-foreground">
                    <Icon aria-hidden="true" className="size-4" />
                </span>
            </CardHeader>
            <CardContent className="px-4 text-xs text-muted-foreground">
                {detail}
            </CardContent>
        </Card>
    );
}

function DeactivateButton({
    action,
    label,
}: {
    action: string;
    label: string;
}) {
    const [open, setOpen] = useState(false);

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <Button type="button" variant="outline" size="sm">
                    <PowerOff aria-hidden="true" />
                    Desativar
                </Button>
            </DialogTrigger>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>Desativar {label}?</DialogTitle>
                    <DialogDescription>
                        O cadastro deixará de estar disponível para novas
                        operações. O histórico será preservado e o item poderá
                        ser ativado novamente.
                    </DialogDescription>
                </DialogHeader>
                <Form<Record<string, never>>
                    action={action}
                    method="delete"
                    options={{ preserveScroll: true }}
                    onSuccess={() => setOpen(false)}
                >
                    {({ processing }) => (
                        <DialogFooter>
                            <DialogClose asChild>
                                <Button type="button" variant="outline">
                                    Cancelar
                                </Button>
                            </DialogClose>
                            <Button
                                type="submit"
                                variant="destructive"
                                disabled={processing}
                            >
                                {processing && <Spinner />}
                                Desativar
                            </Button>
                        </DialogFooter>
                    )}
                </Form>
            </DialogContent>
        </Dialog>
    );
}

function CreateUnitDialog() {
    const [open, setOpen] = useState(false);

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <Button variant="outline" className="justify-start">
                    <Building2 aria-hidden="true" />
                    Nova unidade
                </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-xl">
                <DialogHeader>
                    <DialogTitle>Criar unidade</DialogTitle>
                    <DialogDescription>
                        Cadastre o local e o fuso horário usado na data
                        operacional.
                    </DialogDescription>
                </DialogHeader>
                <Form<UnitForm>
                    {...admin.units.store.form()}
                    errorBag="create-unit"
                    options={{ preserveScroll: true }}
                    resetOnSuccess
                    onSuccess={() => setOpen(false)}
                    className="space-y-4"
                >
                    {({ processing, errors }) => (
                        <>
                            <div className="grid gap-2">
                                <Label htmlFor="create-unit-name">Nome</Label>
                                <Input
                                    id="create-unit-name"
                                    name="name"
                                    required
                                    maxLength={120}
                                    autoComplete="organization"
                                    placeholder="Unidade Centro"
                                    aria-invalid={Boolean(errors.name)}
                                    aria-describedby={
                                        errors.name
                                            ? 'create-unit-name-error'
                                            : undefined
                                    }
                                />
                                <InputError
                                    id="create-unit-name-error"
                                    message={errors.name}
                                />
                            </div>
                            <div className="grid gap-4 sm:grid-cols-2">
                                <div className="grid gap-2">
                                    <Label htmlFor="create-unit-slug">
                                        Identificador
                                    </Label>
                                    <Input
                                        id="create-unit-slug"
                                        name="slug"
                                        required
                                        maxLength={120}
                                        pattern="[A-Za-z0-9_-]+"
                                        placeholder="unidade-centro"
                                        aria-invalid={Boolean(errors.slug)}
                                    />
                                    <InputError message={errors.slug} />
                                </div>
                                <div className="grid gap-2">
                                    <Label htmlFor="create-unit-timezone">
                                        Fuso horário
                                    </Label>
                                    <Input
                                        id="create-unit-timezone"
                                        name="timezone"
                                        required
                                        defaultValue="America/Sao_Paulo"
                                        placeholder="America/Sao_Paulo"
                                        aria-invalid={Boolean(errors.timezone)}
                                    />
                                    <InputError message={errors.timezone} />
                                </div>
                            </div>
                            <DialogFooter>
                                <DialogClose asChild>
                                    <Button type="button" variant="outline">
                                        Cancelar
                                    </Button>
                                </DialogClose>
                                <Button type="submit" disabled={processing}>
                                    {processing && <Spinner />}
                                    Criar unidade
                                </Button>
                            </DialogFooter>
                        </>
                    )}
                </Form>
            </DialogContent>
        </Dialog>
    );
}

function CreateServiceDialog({ units }: { units: Unit[] }) {
    const [open, setOpen] = useState(false);

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <Button
                    variant="outline"
                    className="justify-start"
                    disabled={units.length === 0}
                >
                    <Settings2 aria-hidden="true" />
                    Novo serviço
                </Button>
            </DialogTrigger>
            <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
                <DialogHeader>
                    <DialogTitle>Criar serviço</DialogTitle>
                    <DialogDescription>
                        Defina os prefixos das senhas e a proporção máxima de
                        chamadas prioritárias consecutivas.
                    </DialogDescription>
                </DialogHeader>
                <Form<ServiceForm>
                    {...admin.services.store.form()}
                    errorBag="create-service"
                    options={{ preserveScroll: true }}
                    resetOnSuccess
                    onSuccess={() => setOpen(false)}
                    className="space-y-4"
                >
                    {({ processing, errors }) => (
                        <>
                            <div className="grid gap-2">
                                <Label htmlFor="create-service-unit">
                                    Unidade
                                </Label>
                                <select
                                    id="create-service-unit"
                                    name="unit_id"
                                    required
                                    defaultValue={units[0]?.id}
                                    className={selectClassName}
                                    aria-invalid={Boolean(errors.unit_id)}
                                >
                                    {units.map((unit) => (
                                        <option key={unit.id} value={unit.id}>
                                            {unit.name}
                                        </option>
                                    ))}
                                </select>
                                <InputError message={errors.unit_id} />
                            </div>
                            <div className="grid gap-4 sm:grid-cols-2">
                                <div className="grid gap-2">
                                    <Label htmlFor="create-service-name">
                                        Nome
                                    </Label>
                                    <Input
                                        id="create-service-name"
                                        name="name"
                                        required
                                        maxLength={120}
                                        placeholder="Atendimento geral"
                                        aria-invalid={Boolean(errors.name)}
                                    />
                                    <InputError message={errors.name} />
                                </div>
                                <div className="grid gap-2">
                                    <Label htmlFor="create-service-slug">
                                        Identificador
                                    </Label>
                                    <Input
                                        id="create-service-slug"
                                        name="slug"
                                        required
                                        maxLength={120}
                                        pattern="[A-Za-z0-9_-]+"
                                        placeholder="atendimento-geral"
                                        aria-invalid={Boolean(errors.slug)}
                                    />
                                    <InputError message={errors.slug} />
                                </div>
                            </div>
                            <div className="grid gap-4 sm:grid-cols-3">
                                <div className="grid gap-2">
                                    <Label htmlFor="create-standard-prefix">
                                        Prefixo comum
                                    </Label>
                                    <Input
                                        id="create-standard-prefix"
                                        name="standard_prefix"
                                        required
                                        maxLength={8}
                                        pattern="[A-Z0-9]+"
                                        autoCapitalize="characters"
                                        defaultValue="N"
                                        aria-invalid={Boolean(
                                            errors.standard_prefix,
                                        )}
                                    />
                                    <InputError
                                        message={errors.standard_prefix}
                                    />
                                </div>
                                <div className="grid gap-2">
                                    <Label htmlFor="create-priority-prefix">
                                        Prefixo prioritário
                                    </Label>
                                    <Input
                                        id="create-priority-prefix"
                                        name="priority_prefix"
                                        required
                                        maxLength={8}
                                        pattern="[A-Z0-9]+"
                                        autoCapitalize="characters"
                                        defaultValue="P"
                                        aria-invalid={Boolean(
                                            errors.priority_prefix,
                                        )}
                                    />
                                    <InputError
                                        message={errors.priority_prefix}
                                    />
                                </div>
                                <div className="grid gap-2">
                                    <Label htmlFor="create-priority-limit">
                                        Limite prioritário
                                    </Label>
                                    <Input
                                        id="create-priority-limit"
                                        name="priority_streak_limit"
                                        type="number"
                                        required
                                        min={1}
                                        max={20}
                                        defaultValue={2}
                                        aria-invalid={Boolean(
                                            errors.priority_streak_limit,
                                        )}
                                    />
                                    <InputError
                                        message={errors.priority_streak_limit}
                                    />
                                </div>
                            </div>
                            <p className="text-xs text-muted-foreground">
                                O limite define quantas senhas prioritárias
                                podem ser chamadas antes de uma senha comum.
                            </p>
                            <DialogFooter>
                                <DialogClose asChild>
                                    <Button type="button" variant="outline">
                                        Cancelar
                                    </Button>
                                </DialogClose>
                                <Button type="submit" disabled={processing}>
                                    {processing && <Spinner />}
                                    Criar serviço
                                </Button>
                            </DialogFooter>
                        </>
                    )}
                </Form>
            </DialogContent>
        </Dialog>
    );
}

function CreateCounterDialog({
    units,
    services,
}: {
    units: Unit[];
    services: AdminService[];
}) {
    const [open, setOpen] = useState(false);
    const [unitId, setUnitId] = useState(units[0]?.id ?? '');
    const selectedUnitId = unitId || units[0]?.id || '';
    const availableServices = services.filter(
        (service) =>
            service.unit_id === selectedUnitId && service.is_active !== false,
    );

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <Button
                    variant="outline"
                    className="justify-start"
                    disabled={units.length === 0}
                >
                    <MonitorCog aria-hidden="true" />
                    Novo guichê
                </Button>
            </DialogTrigger>
            <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
                <DialogHeader>
                    <DialogTitle>Criar guichê</DialogTitle>
                    <DialogDescription>
                        Associe ao menos um serviço da mesma unidade ao novo
                        guichê.
                    </DialogDescription>
                </DialogHeader>
                <Form<CounterForm>
                    {...admin.counters.store.form()}
                    errorBag="create-counter"
                    options={{ preserveScroll: true }}
                    resetOnSuccess
                    onSuccess={() => setOpen(false)}
                    className="space-y-4"
                >
                    {({ processing, errors }) => (
                        <>
                            <div className="grid gap-4 sm:grid-cols-3">
                                <div className="grid gap-2 sm:col-span-3">
                                    <Label htmlFor="create-counter-unit">
                                        Unidade
                                    </Label>
                                    <select
                                        id="create-counter-unit"
                                        name="unit_id"
                                        required
                                        value={selectedUnitId}
                                        onChange={(event) =>
                                            setUnitId(event.target.value)
                                        }
                                        className={selectClassName}
                                        aria-invalid={Boolean(errors.unit_id)}
                                    >
                                        {units.map((unit) => (
                                            <option
                                                key={unit.id}
                                                value={unit.id}
                                            >
                                                {unit.name}
                                            </option>
                                        ))}
                                    </select>
                                    <InputError message={errors.unit_id} />
                                </div>
                                <div className="grid gap-2 sm:col-span-2">
                                    <Label htmlFor="create-counter-name">
                                        Nome
                                    </Label>
                                    <Input
                                        id="create-counter-name"
                                        name="name"
                                        required
                                        maxLength={120}
                                        placeholder="Guichê principal"
                                        aria-invalid={Boolean(errors.name)}
                                    />
                                    <InputError message={errors.name} />
                                </div>
                                <div className="grid gap-2">
                                    <Label htmlFor="create-counter-code">
                                        Código
                                    </Label>
                                    <Input
                                        id="create-counter-code"
                                        name="code"
                                        required
                                        maxLength={24}
                                        placeholder="G01"
                                        aria-invalid={Boolean(errors.code)}
                                    />
                                    <InputError message={errors.code} />
                                </div>
                            </div>
                            <fieldset className="space-y-3 rounded-lg border p-4">
                                <legend className="px-1 text-sm font-medium">
                                    Serviços atendidos
                                </legend>
                                {availableServices.length > 0 ? (
                                    <div className="grid gap-3 sm:grid-cols-2">
                                        {availableServices.map((service) => {
                                            const id = `create-counter-service-${service.id}`;

                                            return (
                                                <div
                                                    key={service.id}
                                                    className="flex items-center gap-2"
                                                >
                                                    <Checkbox
                                                        id={id}
                                                        name="service_ids[]"
                                                        value={service.id}
                                                    />
                                                    <Label
                                                        htmlFor={id}
                                                        className="font-normal"
                                                    >
                                                        {service.name}
                                                    </Label>
                                                </div>
                                            );
                                        })}
                                    </div>
                                ) : (
                                    <p className="text-sm text-muted-foreground">
                                        Esta unidade não possui serviços ativos.
                                    </p>
                                )}
                                <InputError message={errors.service_ids} />
                            </fieldset>
                            <DialogFooter>
                                <DialogClose asChild>
                                    <Button type="button" variant="outline">
                                        Cancelar
                                    </Button>
                                </DialogClose>
                                <Button
                                    type="submit"
                                    disabled={
                                        processing ||
                                        availableServices.length === 0
                                    }
                                >
                                    {processing && <Spinner />}
                                    Criar guichê
                                </Button>
                            </DialogFooter>
                        </>
                    )}
                </Form>
            </DialogContent>
        </Dialog>
    );
}

function CreateUserDialog({ units }: { units: Unit[] }) {
    const [open, setOpen] = useState(false);
    const [role, setRole] = useState<User['role']>('attendant');

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <Button variant="outline" className="justify-start">
                    <UserPlus aria-hidden="true" />
                    Novo usuário
                </Button>
            </DialogTrigger>
            <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
                <DialogHeader>
                    <DialogTitle>Criar usuário</DialogTitle>
                    <DialogDescription>
                        Administradores acessam todas as unidades. Atendentes
                        devem ser associados a uma unidade.
                    </DialogDescription>
                </DialogHeader>
                <Form<UserForm>
                    {...admin.users.store.form()}
                    errorBag="create-user"
                    options={{ preserveScroll: true }}
                    resetOnSuccess
                    onSuccess={() => setOpen(false)}
                    className="space-y-4"
                >
                    {({ processing, errors }) => (
                        <>
                            <div className="grid gap-4 sm:grid-cols-2">
                                <div className="grid gap-2">
                                    <Label htmlFor="create-user-name">
                                        Nome
                                    </Label>
                                    <Input
                                        id="create-user-name"
                                        name="name"
                                        required
                                        maxLength={120}
                                        autoComplete="name"
                                        placeholder="Nome completo"
                                        aria-invalid={Boolean(errors.name)}
                                    />
                                    <InputError message={errors.name} />
                                </div>
                                <div className="grid gap-2">
                                    <Label htmlFor="create-user-email">
                                        E-mail
                                    </Label>
                                    <Input
                                        id="create-user-email"
                                        name="email"
                                        type="email"
                                        required
                                        maxLength={255}
                                        autoComplete="email"
                                        placeholder="nome@empresa.com"
                                        aria-invalid={Boolean(errors.email)}
                                    />
                                    <InputError message={errors.email} />
                                </div>
                                <div className="grid gap-2">
                                    <Label htmlFor="create-user-password">
                                        Senha inicial
                                    </Label>
                                    <Input
                                        id="create-user-password"
                                        name="password"
                                        type="password"
                                        required
                                        autoComplete="new-password"
                                        aria-invalid={Boolean(errors.password)}
                                    />
                                    <InputError message={errors.password} />
                                </div>
                                <div className="grid gap-2">
                                    <Label htmlFor="create-user-role">
                                        Perfil
                                    </Label>
                                    <select
                                        id="create-user-role"
                                        name="role"
                                        value={role}
                                        onChange={(event) =>
                                            setRole(
                                                event.target
                                                    .value as User['role'],
                                            )
                                        }
                                        className={selectClassName}
                                        aria-invalid={Boolean(errors.role)}
                                    >
                                        <option value="attendant">
                                            Atendente
                                        </option>
                                        <option value="admin">
                                            Administrador
                                        </option>
                                    </select>
                                    <InputError message={errors.role} />
                                </div>
                            </div>
                            <div className="grid gap-2">
                                <Label htmlFor="create-user-unit">
                                    Unidade do atendente
                                </Label>
                                <select
                                    id="create-user-unit"
                                    name="unit_id"
                                    required={role === 'attendant'}
                                    disabled={role === 'admin'}
                                    defaultValue=""
                                    className={selectClassName}
                                    aria-invalid={Boolean(errors.unit_id)}
                                >
                                    <option value="" disabled>
                                        Selecione uma unidade
                                    </option>
                                    {units.map((unit) => (
                                        <option key={unit.id} value={unit.id}>
                                            {unit.name}
                                        </option>
                                    ))}
                                </select>
                                <InputError message={errors.unit_id} />
                            </div>
                            <DialogFooter>
                                <DialogClose asChild>
                                    <Button type="button" variant="outline">
                                        Cancelar
                                    </Button>
                                </DialogClose>
                                <Button
                                    type="submit"
                                    disabled={
                                        processing ||
                                        (role === 'attendant' &&
                                            units.length === 0)
                                    }
                                >
                                    {processing && <Spinner />}
                                    Criar usuário
                                </Button>
                            </DialogFooter>
                        </>
                    )}
                </Form>
            </DialogContent>
        </Dialog>
    );
}

function UnitRow({ unit }: { unit: Unit }) {
    return (
        <div className="space-y-3 rounded-lg border p-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                    <span className="font-medium">{unit.name}</span>
                    <Badge
                        variant={
                            unit.is_active === false ? 'outline' : 'default'
                        }
                    >
                        {unit.is_active === false ? 'Inativa' : 'Ativa'}
                    </Badge>
                </div>
                {unit.is_active !== false && (
                    <DeactivateButton
                        action={admin.units.destroy.url(unit)}
                        label={`a unidade “${unit.name}”`}
                    />
                )}
            </div>
            <Form<UnitForm>
                {...admin.units.update.form(unit)}
                errorBag={`unit-${unit.id}`}
                options={{ preserveScroll: true }}
                className="grid gap-3 md:grid-cols-3"
            >
                {({ processing, errors, recentlySuccessful }) => (
                    <>
                        <div className="grid gap-1.5">
                            <Label htmlFor={`unit-name-${unit.id}`}>Nome</Label>
                            <Input
                                id={`unit-name-${unit.id}`}
                                name="name"
                                required
                                maxLength={120}
                                defaultValue={unit.name}
                                aria-invalid={Boolean(errors.name)}
                            />
                            <InputError message={errors.name} />
                        </div>
                        <div className="grid gap-1.5">
                            <Label htmlFor={`unit-slug-${unit.id}`}>
                                Identificador
                            </Label>
                            <Input
                                id={`unit-slug-${unit.id}`}
                                name="slug"
                                required
                                maxLength={120}
                                pattern="[A-Za-z0-9_-]+"
                                defaultValue={unit.slug}
                                aria-invalid={Boolean(errors.slug)}
                            />
                            <InputError message={errors.slug} />
                        </div>
                        <div className="grid gap-1.5">
                            <Label htmlFor={`unit-timezone-${unit.id}`}>
                                Fuso horário
                            </Label>
                            <Input
                                id={`unit-timezone-${unit.id}`}
                                name="timezone"
                                required
                                defaultValue={unit.timezone}
                                aria-invalid={Boolean(errors.timezone)}
                            />
                            <InputError message={errors.timezone} />
                        </div>
                        <div className="flex flex-wrap items-center gap-2 md:col-span-3">
                            <Button
                                type="submit"
                                size="sm"
                                disabled={processing}
                            >
                                {processing ? <Spinner /> : <Save />}
                                Salvar
                            </Button>
                            {unit.is_active === false && (
                                <Button
                                    type="submit"
                                    name="is_active"
                                    value="1"
                                    size="sm"
                                    variant="secondary"
                                    disabled={processing}
                                >
                                    <Power aria-hidden="true" />
                                    Ativar
                                </Button>
                            )}
                            <span
                                aria-live="polite"
                                className="text-xs text-muted-foreground"
                            >
                                {recentlySuccessful ? 'Alterações salvas.' : ''}
                            </span>
                        </div>
                    </>
                )}
            </Form>
        </div>
    );
}

function ServiceRow({
    service,
    units,
}: {
    service: AdminService;
    units: Unit[];
}) {
    return (
        <div className="space-y-3 rounded-lg border p-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex flex-wrap items-center gap-2">
                    <span className="font-medium">{service.name}</span>
                    <Badge
                        variant={
                            service.is_active === false ? 'outline' : 'default'
                        }
                    >
                        {service.is_active === false ? 'Inativo' : 'Ativo'}
                    </Badge>
                    <span className="text-xs text-muted-foreground">
                        {service.unit?.name ??
                            units.find((unit) => unit.id === service.unit_id)
                                ?.name}
                    </span>
                </div>
                {service.is_active !== false && (
                    <DeactivateButton
                        action={admin.services.destroy.url(service)}
                        label={`o serviço “${service.name}”`}
                    />
                )}
            </div>
            <Form<ServiceForm>
                {...admin.services.update.form(service)}
                errorBag={`service-${service.id}`}
                options={{ preserveScroll: true }}
                className="grid gap-3 sm:grid-cols-2 xl:grid-cols-6"
            >
                {({ processing, errors, recentlySuccessful }) => (
                    <>
                        <div className="grid gap-1.5 sm:col-span-2">
                            <Label htmlFor={`service-unit-${service.id}`}>
                                Unidade
                            </Label>
                            <select
                                id={`service-unit-${service.id}`}
                                name="unit_id"
                                required
                                defaultValue={service.unit_id}
                                className={selectClassName}
                                aria-invalid={Boolean(errors.unit_id)}
                            >
                                {units.map((unit) => (
                                    <option key={unit.id} value={unit.id}>
                                        {unit.name}
                                    </option>
                                ))}
                            </select>
                            <InputError message={errors.unit_id} />
                        </div>
                        <div className="grid gap-1.5 sm:col-span-2">
                            <Label htmlFor={`service-name-${service.id}`}>
                                Nome
                            </Label>
                            <Input
                                id={`service-name-${service.id}`}
                                name="name"
                                required
                                maxLength={120}
                                defaultValue={service.name}
                                aria-invalid={Boolean(errors.name)}
                            />
                            <InputError message={errors.name} />
                        </div>
                        <div className="grid gap-1.5 sm:col-span-2">
                            <Label htmlFor={`service-slug-${service.id}`}>
                                Identificador
                            </Label>
                            <Input
                                id={`service-slug-${service.id}`}
                                name="slug"
                                required
                                maxLength={120}
                                pattern="[A-Za-z0-9_-]+"
                                defaultValue={service.slug}
                                aria-invalid={Boolean(errors.slug)}
                            />
                            <InputError message={errors.slug} />
                        </div>
                        <div className="grid gap-1.5 xl:col-span-2">
                            <Label htmlFor={`standard-prefix-${service.id}`}>
                                Prefixo comum
                            </Label>
                            <Input
                                id={`standard-prefix-${service.id}`}
                                name="standard_prefix"
                                required
                                maxLength={8}
                                pattern="[A-Z0-9]+"
                                autoCapitalize="characters"
                                defaultValue={service.standard_prefix}
                                aria-invalid={Boolean(errors.standard_prefix)}
                            />
                            <InputError message={errors.standard_prefix} />
                        </div>
                        <div className="grid gap-1.5 xl:col-span-2">
                            <Label htmlFor={`priority-prefix-${service.id}`}>
                                Prefixo prioritário
                            </Label>
                            <Input
                                id={`priority-prefix-${service.id}`}
                                name="priority_prefix"
                                required
                                maxLength={8}
                                pattern="[A-Z0-9]+"
                                autoCapitalize="characters"
                                defaultValue={service.priority_prefix}
                                aria-invalid={Boolean(errors.priority_prefix)}
                            />
                            <InputError message={errors.priority_prefix} />
                        </div>
                        <div className="grid gap-1.5 xl:col-span-2">
                            <Label htmlFor={`priority-limit-${service.id}`}>
                                Limite prioritário
                            </Label>
                            <Input
                                id={`priority-limit-${service.id}`}
                                name="priority_streak_limit"
                                type="number"
                                required
                                min={1}
                                max={20}
                                defaultValue={service.priority_streak_limit}
                                aria-invalid={Boolean(
                                    errors.priority_streak_limit,
                                )}
                            />
                            <InputError
                                message={errors.priority_streak_limit}
                            />
                        </div>
                        <div className="flex flex-wrap items-center gap-2 sm:col-span-2 xl:col-span-6">
                            <Button
                                type="submit"
                                size="sm"
                                disabled={processing}
                            >
                                {processing ? <Spinner /> : <Save />}
                                Salvar
                            </Button>
                            {service.is_active === false && (
                                <Button
                                    type="submit"
                                    name="is_active"
                                    value="1"
                                    size="sm"
                                    variant="secondary"
                                    disabled={processing}
                                >
                                    <Power aria-hidden="true" />
                                    Ativar
                                </Button>
                            )}
                            <span
                                aria-live="polite"
                                className="text-xs text-muted-foreground"
                            >
                                {recentlySuccessful ? 'Alterações salvas.' : ''}
                            </span>
                        </div>
                    </>
                )}
            </Form>
        </div>
    );
}

function CounterRow({
    counter,
    units,
    services,
}: {
    counter: AdminCounter;
    units: Unit[];
    services: AdminService[];
}) {
    const [unitId, setUnitId] = useState(counter.unit_id ?? units[0]?.id ?? '');
    const availableServices = services.filter(
        (service) => service.unit_id === unitId,
    );

    return (
        <div className="space-y-3 rounded-lg border p-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex flex-wrap items-center gap-2">
                    <span className="font-medium">{counter.name}</span>
                    <Badge variant="outline">{counter.code}</Badge>
                    <Badge
                        variant={
                            counter.is_active === false ? 'outline' : 'default'
                        }
                    >
                        {counter.is_active === false ? 'Inativo' : 'Ativo'}
                    </Badge>
                </div>
                {counter.is_active !== false && (
                    <DeactivateButton
                        action={admin.counters.destroy.url(counter)}
                        label={`o guichê “${counter.name}”`}
                    />
                )}
            </div>
            <Form<CounterForm>
                {...admin.counters.update.form(counter)}
                errorBag={`counter-${counter.id}`}
                options={{ preserveScroll: true }}
                className="grid gap-3 lg:grid-cols-2"
            >
                {({ processing, errors, recentlySuccessful }) => (
                    <>
                        <div className="grid gap-1.5">
                            <Label htmlFor={`counter-unit-${counter.id}`}>
                                Unidade
                            </Label>
                            <select
                                id={`counter-unit-${counter.id}`}
                                name="unit_id"
                                required
                                value={unitId}
                                onChange={(event) =>
                                    setUnitId(event.target.value)
                                }
                                className={selectClassName}
                                aria-invalid={Boolean(errors.unit_id)}
                            >
                                {units.map((unit) => (
                                    <option key={unit.id} value={unit.id}>
                                        {unit.name}
                                    </option>
                                ))}
                            </select>
                            <InputError message={errors.unit_id} />
                        </div>
                        <div className="grid grid-cols-[1fr_minmax(6rem,0.4fr)] gap-3">
                            <div className="grid gap-1.5">
                                <Label htmlFor={`counter-name-${counter.id}`}>
                                    Nome
                                </Label>
                                <Input
                                    id={`counter-name-${counter.id}`}
                                    name="name"
                                    required
                                    maxLength={120}
                                    defaultValue={counter.name}
                                    aria-invalid={Boolean(errors.name)}
                                />
                                <InputError message={errors.name} />
                            </div>
                            <div className="grid gap-1.5">
                                <Label htmlFor={`counter-code-${counter.id}`}>
                                    Código
                                </Label>
                                <Input
                                    id={`counter-code-${counter.id}`}
                                    name="code"
                                    required
                                    maxLength={24}
                                    defaultValue={counter.code}
                                    aria-invalid={Boolean(errors.code)}
                                />
                                <InputError message={errors.code} />
                            </div>
                        </div>
                        <fieldset className="space-y-3 rounded-lg border p-3 lg:col-span-2">
                            <legend className="px-1 text-sm font-medium">
                                Serviços associados
                            </legend>
                            {availableServices.length > 0 ? (
                                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                                    {availableServices.map((service) => {
                                        const id = `counter-${counter.id}-service-${service.id}`;

                                        return (
                                            <div
                                                key={service.id}
                                                className="flex items-center gap-2"
                                            >
                                                <Checkbox
                                                    id={id}
                                                    name="service_ids[]"
                                                    value={service.id}
                                                    defaultChecked={counter.services.some(
                                                        (associatedService) =>
                                                            associatedService.id ===
                                                            service.id,
                                                    )}
                                                />
                                                <Label
                                                    htmlFor={id}
                                                    className="font-normal"
                                                >
                                                    {service.name}
                                                    {service.is_active ===
                                                        false && ' (inativo)'}
                                                </Label>
                                            </div>
                                        );
                                    })}
                                </div>
                            ) : (
                                <p className="text-sm text-muted-foreground">
                                    Nenhum serviço cadastrado nesta unidade.
                                </p>
                            )}
                            <InputError message={errors.service_ids} />
                        </fieldset>
                        <div className="flex flex-wrap items-center gap-2 lg:col-span-2">
                            <Button
                                type="submit"
                                size="sm"
                                disabled={
                                    processing || availableServices.length === 0
                                }
                            >
                                {processing ? <Spinner /> : <Save />}
                                Salvar
                            </Button>
                            {counter.is_active === false && (
                                <Button
                                    type="submit"
                                    name="is_active"
                                    value="1"
                                    size="sm"
                                    variant="secondary"
                                    disabled={
                                        processing ||
                                        availableServices.length === 0
                                    }
                                >
                                    <Power aria-hidden="true" />
                                    Ativar
                                </Button>
                            )}
                            <span
                                aria-live="polite"
                                className="text-xs text-muted-foreground"
                            >
                                {recentlySuccessful ? 'Alterações salvas.' : ''}
                            </span>
                        </div>
                    </>
                )}
            </Form>
        </div>
    );
}

function UserRow({ user, units }: { user: AdminUser; units: Unit[] }) {
    const [role, setRole] = useState<User['role']>(user.role);

    return (
        <div className="space-y-3 rounded-lg border p-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                        <span className="font-medium">{user.name}</span>
                        <Badge variant="outline">
                            {user.role === 'admin'
                                ? 'Administrador'
                                : 'Atendente'}
                        </Badge>
                        <Badge variant={user.is_active ? 'default' : 'outline'}>
                            {user.is_active ? 'Ativo' : 'Inativo'}
                        </Badge>
                    </div>
                    <p className="truncate text-sm text-muted-foreground">
                        {user.email}
                    </p>
                </div>
                {user.is_active && (
                    <DeactivateButton
                        action={admin.users.destroy.url(user)}
                        label={`o usuário “${user.name}”`}
                    />
                )}
            </div>
            <Form<UserForm>
                {...admin.users.update.form(user)}
                errorBag={`user-${user.id}`}
                options={{ preserveScroll: true }}
                resetOnSuccess={['password']}
                className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4"
            >
                {({ processing, errors, recentlySuccessful }) => (
                    <>
                        <div className="grid gap-1.5">
                            <Label htmlFor={`user-name-${user.id}`}>Nome</Label>
                            <Input
                                id={`user-name-${user.id}`}
                                name="name"
                                required
                                maxLength={120}
                                defaultValue={user.name}
                                autoComplete="name"
                                aria-invalid={Boolean(errors.name)}
                            />
                            <InputError message={errors.name} />
                        </div>
                        <div className="grid gap-1.5">
                            <Label htmlFor={`user-email-${user.id}`}>
                                E-mail
                            </Label>
                            <Input
                                id={`user-email-${user.id}`}
                                name="email"
                                type="email"
                                required
                                maxLength={255}
                                defaultValue={user.email}
                                autoComplete="email"
                                aria-invalid={Boolean(errors.email)}
                            />
                            <InputError message={errors.email} />
                        </div>
                        <div className="grid gap-1.5">
                            <Label htmlFor={`user-role-${user.id}`}>
                                Perfil
                            </Label>
                            <select
                                id={`user-role-${user.id}`}
                                name="role"
                                value={role}
                                onChange={(event) =>
                                    setRole(event.target.value as User['role'])
                                }
                                className={selectClassName}
                                aria-invalid={Boolean(errors.role)}
                            >
                                <option value="attendant">Atendente</option>
                                <option value="admin">Administrador</option>
                            </select>
                            <InputError message={errors.role} />
                        </div>
                        <div className="grid gap-1.5">
                            <Label htmlFor={`user-unit-${user.id}`}>
                                Unidade
                            </Label>
                            <select
                                id={`user-unit-${user.id}`}
                                name="unit_id"
                                required={role === 'attendant'}
                                disabled={role === 'admin'}
                                defaultValue={user.unit_id ?? ''}
                                className={selectClassName}
                                aria-invalid={Boolean(errors.unit_id)}
                            >
                                <option value="" disabled>
                                    Selecione
                                </option>
                                {units.map((unit) => (
                                    <option key={unit.id} value={unit.id}>
                                        {unit.name}
                                    </option>
                                ))}
                            </select>
                            <InputError message={errors.unit_id} />
                        </div>
                        <div className="grid gap-1.5 sm:col-span-2 xl:col-span-4">
                            <Label htmlFor={`user-password-${user.id}`}>
                                Nova senha{' '}
                                <span className="font-normal text-muted-foreground">
                                    (opcional)
                                </span>
                            </Label>
                            <Input
                                id={`user-password-${user.id}`}
                                name="password"
                                type="password"
                                autoComplete="new-password"
                                className="max-w-md"
                                aria-invalid={Boolean(errors.password)}
                            />
                            <InputError message={errors.password} />
                        </div>
                        <div className="flex flex-wrap items-center gap-2 sm:col-span-2 xl:col-span-4">
                            <Button
                                type="submit"
                                size="sm"
                                disabled={processing}
                            >
                                {processing ? <Spinner /> : <Save />}
                                Salvar
                            </Button>
                            {!user.is_active && (
                                <Button
                                    type="submit"
                                    name="is_active"
                                    value="1"
                                    size="sm"
                                    variant="secondary"
                                    disabled={processing}
                                >
                                    <Power aria-hidden="true" />
                                    Ativar
                                </Button>
                            )}
                            <span
                                aria-live="polite"
                                className="text-xs text-muted-foreground"
                            >
                                {recentlySuccessful ? 'Alterações salvas.' : ''}
                            </span>
                        </div>
                    </>
                )}
            </Form>
        </div>
    );
}

function TicketFilters({
    filters,
    units,
    services,
    counters,
    statusOptions,
    priorityOptions,
    perPage,
}: {
    filters: DashboardFilters;
    units: Unit[];
    services: AdminService[];
    counters: AdminCounter[];
    statusOptions: FilterOption<TicketStatus>[];
    priorityOptions: FilterOption<TicketPriority>[];
    perPage: number;
}) {
    return (
        <Card>
            <CardHeader>
                <CardTitle>Filtros de tickets</CardTitle>
                <CardDescription>
                    Combine unidade, atendimento, situação e período.
                </CardDescription>
            </CardHeader>
            <CardContent>
                <Form<TicketFilterForm>
                    {...admin.dashboard.form()}
                    options={{ preserveScroll: true, preserveState: true }}
                    className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4"
                >
                    {({ processing, errors }) => (
                        <>
                            <div className="grid gap-1.5">
                                <Label htmlFor="filter-unit">Unidade</Label>
                                <select
                                    id="filter-unit"
                                    name="unit_id"
                                    defaultValue={filters.unit_id ?? ''}
                                    className={selectClassName}
                                    aria-invalid={Boolean(errors.unit_id)}
                                >
                                    <option value="">Todas</option>
                                    {units.map((unit) => (
                                        <option key={unit.id} value={unit.id}>
                                            {unit.name}
                                        </option>
                                    ))}
                                </select>
                                <InputError message={errors.unit_id} />
                            </div>
                            <div className="grid gap-1.5">
                                <Label htmlFor="filter-service">Serviço</Label>
                                <select
                                    id="filter-service"
                                    name="service_id"
                                    defaultValue={filters.service_id ?? ''}
                                    className={selectClassName}
                                    aria-invalid={Boolean(errors.service_id)}
                                >
                                    <option value="">Todos</option>
                                    {services.map((service) => (
                                        <option
                                            key={service.id}
                                            value={service.id}
                                        >
                                            {service.name}
                                            {service.unit?.name
                                                ? ` — ${service.unit.name}`
                                                : ''}
                                        </option>
                                    ))}
                                </select>
                                <InputError message={errors.service_id} />
                            </div>
                            <div className="grid gap-1.5">
                                <Label htmlFor="filter-counter">Guichê</Label>
                                <select
                                    id="filter-counter"
                                    name="counter_id"
                                    defaultValue={filters.counter_id ?? ''}
                                    className={selectClassName}
                                    aria-invalid={Boolean(errors.counter_id)}
                                >
                                    <option value="">Todos</option>
                                    {counters.map((counter) => (
                                        <option
                                            key={counter.id}
                                            value={counter.id}
                                        >
                                            {counter.name} ({counter.code})
                                        </option>
                                    ))}
                                </select>
                                <InputError message={errors.counter_id} />
                            </div>
                            <div className="grid gap-1.5">
                                <Label htmlFor="filter-status">Situação</Label>
                                <select
                                    id="filter-status"
                                    name="status"
                                    defaultValue={filters.status ?? ''}
                                    className={selectClassName}
                                    aria-invalid={Boolean(errors.status)}
                                >
                                    <option value="">Todas</option>
                                    {statusOptions.map((option) => (
                                        <option
                                            key={option.value}
                                            value={option.value}
                                        >
                                            {option.label}
                                        </option>
                                    ))}
                                </select>
                                <InputError message={errors.status} />
                            </div>
                            <div className="grid gap-1.5">
                                <Label htmlFor="filter-priority">
                                    Prioridade
                                </Label>
                                <select
                                    id="filter-priority"
                                    name="priority"
                                    defaultValue={filters.priority ?? ''}
                                    className={selectClassName}
                                    aria-invalid={Boolean(errors.priority)}
                                >
                                    <option value="">Todas</option>
                                    {priorityOptions.map((option) => (
                                        <option
                                            key={option.value}
                                            value={option.value}
                                        >
                                            {option.label}
                                        </option>
                                    ))}
                                </select>
                                <InputError message={errors.priority} />
                            </div>
                            <div className="grid gap-1.5">
                                <Label htmlFor="filter-from">De</Label>
                                <Input
                                    id="filter-from"
                                    name="from"
                                    type="date"
                                    defaultValue={filters.from}
                                    aria-invalid={Boolean(errors.from)}
                                />
                                <InputError message={errors.from} />
                            </div>
                            <div className="grid gap-1.5">
                                <Label htmlFor="filter-to">Até</Label>
                                <Input
                                    id="filter-to"
                                    name="to"
                                    type="date"
                                    defaultValue={filters.to}
                                    min={filters.from}
                                    aria-invalid={Boolean(errors.to)}
                                />
                                <InputError message={errors.to} />
                            </div>
                            <div className="grid gap-1.5">
                                <Label htmlFor="filter-per-page">
                                    Itens por página
                                </Label>
                                <select
                                    id="filter-per-page"
                                    name="per_page"
                                    defaultValue={filters.per_page ?? perPage}
                                    className={selectClassName}
                                    aria-invalid={Boolean(errors.per_page)}
                                >
                                    {[10, 25, 50, 100].map((amount) => (
                                        <option key={amount} value={amount}>
                                            {amount}
                                        </option>
                                    ))}
                                </select>
                                <InputError message={errors.per_page} />
                            </div>
                            <div className="flex flex-wrap gap-2 sm:col-span-2 lg:col-span-4">
                                <Button type="submit" disabled={processing}>
                                    {processing && <Spinner />}
                                    Aplicar filtros
                                </Button>
                                <Button variant="outline" asChild>
                                    <Link href={admin.dashboard()}>
                                        Limpar filtros
                                    </Link>
                                </Button>
                            </div>
                        </>
                    )}
                </Form>
            </CardContent>
        </Card>
    );
}

function TicketPagination({ tickets }: { tickets: Pagination<Ticket> }) {
    const previousUrl = tickets.prev_page_url;
    const nextUrl = tickets.next_page_url;

    return (
        <nav
            aria-label="Paginação dos tickets"
            className="flex flex-col items-center justify-between gap-3 border-t px-4 py-3 sm:flex-row"
        >
            <p className="text-sm text-muted-foreground" aria-live="polite">
                Página {tickets.current_page} de {tickets.last_page} ·{' '}
                {tickets.total} ticket{tickets.total === 1 ? '' : 's'}
            </p>
            <div className="flex gap-2">
                {previousUrl ? (
                    <Button variant="outline" size="sm" asChild>
                        <Link
                            href={previousUrl}
                            preserveScroll
                            aria-label="Ir para a página anterior"
                        >
                            <ChevronLeft aria-hidden="true" />
                            Anterior
                        </Link>
                    </Button>
                ) : (
                    <Button variant="outline" size="sm" disabled>
                        <ChevronLeft aria-hidden="true" />
                        Anterior
                    </Button>
                )}
                {nextUrl ? (
                    <Button variant="outline" size="sm" asChild>
                        <Link
                            href={nextUrl}
                            preserveScroll
                            aria-label="Ir para a próxima página"
                        >
                            Próxima
                            <ChevronRight aria-hidden="true" />
                        </Link>
                    </Button>
                ) : (
                    <Button variant="outline" size="sm" disabled>
                        Próxima
                        <ChevronRight aria-hidden="true" />
                    </Button>
                )}
            </div>
        </nav>
    );
}

function TicketsTable({
    tickets,
    selectedBusinessDate,
}: {
    tickets: Pagination<Ticket>;
    selectedBusinessDate: string;
}) {
    return (
        <Card className="overflow-hidden">
            <CardHeader>
                <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="space-y-1.5">
                        <CardTitle>Tickets do dia</CardTitle>
                        <CardDescription>
                            Data operacional de referência:{' '}
                            {formatBusinessDate(selectedBusinessDate)}
                        </CardDescription>
                    </div>
                    <Badge variant="outline">
                        {tickets.total} resultado
                        {tickets.total === 1 ? '' : 's'}
                    </Badge>
                </div>
            </CardHeader>
            <CardContent className="px-0">
                <div className="overflow-x-auto">
                    <table className="w-full min-w-4xl text-left text-sm">
                        <caption className="sr-only">
                            Tickets conforme os filtros selecionados
                        </caption>
                        <thead className="border-y bg-muted/50 text-xs text-muted-foreground uppercase">
                            <tr>
                                <th
                                    scope="col"
                                    className="px-4 py-3 font-medium"
                                >
                                    Senha
                                </th>
                                <th
                                    scope="col"
                                    className="px-4 py-3 font-medium"
                                >
                                    Serviço
                                </th>
                                <th
                                    scope="col"
                                    className="px-4 py-3 font-medium"
                                >
                                    Prioridade
                                </th>
                                <th
                                    scope="col"
                                    className="px-4 py-3 font-medium"
                                >
                                    Situação
                                </th>
                                <th
                                    scope="col"
                                    className="px-4 py-3 font-medium"
                                >
                                    Guichê
                                </th>
                                <th
                                    scope="col"
                                    className="px-4 py-3 font-medium"
                                >
                                    Data
                                </th>
                                <th
                                    scope="col"
                                    className="px-4 py-3 font-medium"
                                >
                                    Emissão
                                </th>
                                <th
                                    scope="col"
                                    className="px-4 py-3 font-medium"
                                >
                                    Histórico
                                </th>
                            </tr>
                        </thead>
                        <tbody className="divide-y">
                            {tickets.data.length > 0 ? (
                                tickets.data.map((ticket) => (
                                    <tr
                                        key={ticket.id}
                                        className="transition-colors hover:bg-muted/30"
                                    >
                                        <th
                                            scope="row"
                                            className="px-4 py-3 font-semibold whitespace-nowrap"
                                        >
                                            {ticket.code}
                                        </th>
                                        <td className="px-4 py-3">
                                            {ticket.service.name}
                                        </td>
                                        <td className="px-4 py-3">
                                            <Badge
                                                variant={
                                                    ticket.priority ===
                                                    'priority'
                                                        ? 'secondary'
                                                        : 'outline'
                                                }
                                            >
                                                {ticket.priority_label}
                                            </Badge>
                                        </td>
                                        <td className="px-4 py-3">
                                            <Badge
                                                variant={statusVariant(
                                                    ticket.status,
                                                )}
                                            >
                                                {ticket.status_label}
                                            </Badge>
                                        </td>
                                        <td className="px-4 py-3 whitespace-nowrap">
                                            {ticket.counter
                                                ? `${ticket.counter.name} (${ticket.counter.code})`
                                                : '—'}
                                        </td>
                                        <td className="px-4 py-3 whitespace-nowrap">
                                            {formatBusinessDate(
                                                ticket.business_date,
                                            )}
                                        </td>
                                        <td className="px-4 py-3 whitespace-nowrap">
                                            {formatDateTime(ticket.issued_at)}
                                        </td>
                                        <td className="px-4 py-3">
                                            <Button
                                                variant="ghost"
                                                size="sm"
                                                asChild
                                            >
                                                <Link
                                                    href={admin.tickets.show(
                                                        ticket,
                                                    )}
                                                    aria-label={`Ver histórico da senha ${ticket.code}`}
                                                >
                                                    <History aria-hidden="true" />
                                                    Ver
                                                </Link>
                                            </Button>
                                        </td>
                                    </tr>
                                ))
                            ) : (
                                <tr>
                                    <td
                                        colSpan={8}
                                        className="px-4 py-10 text-center text-muted-foreground"
                                    >
                                        Nenhum ticket encontrado para os filtros
                                        selecionados.
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
                <TicketPagination tickets={tickets} />
            </CardContent>
        </Card>
    );
}

export default function AdminDashboard({
    metrics,
    units,
    services,
    counters,
    users,
    tickets,
    filters,
    selectedBusinessDate,
    statusOptions,
    priorityOptions,
}: Props) {
    const metricCards = [
        {
            label: 'Aguardando · comum',
            value: metrics.waiting_standard,
            detail: 'Fila sem prioridade',
            icon: Users,
        },
        {
            label: 'Aguardando · prioritária',
            value: metrics.waiting_priority,
            detail: 'Fila com prioridade',
            icon: CircleGauge,
        },
        {
            label: 'Em atendimento',
            value: metrics.serving,
            detail: 'Atendimentos em curso',
            icon: TicketIcon,
        },
        {
            label: 'Concluídos',
            value: metrics.completed,
            detail: 'Finalizados no dia',
            icon: CheckCircle2,
        },
        {
            label: 'Não compareceu',
            value: metrics.no_show,
            detail: 'Ausências registradas',
            icon: XCircle,
        },
        {
            label: 'Espera média',
            value: formatDuration(metrics.average_wait_seconds),
            detail: 'Da emissão à chamada',
            icon: Clock3,
        },
        {
            label: 'Atendimento médio',
            value: formatDuration(metrics.average_service_seconds),
            detail: 'Do início à conclusão',
            icon: Clock3,
        },
    ];

    return (
        <>
            <Head title="Administração" />
            <main className="flex min-w-0 flex-1 flex-col gap-6 p-4 md:p-6">
                <header className="flex flex-col justify-between gap-3 sm:flex-row sm:items-end">
                    <div>
                        <p className="mb-1 text-sm font-medium text-muted-foreground">
                            Operação de{' '}
                            {formatBusinessDate(selectedBusinessDate)}
                        </p>
                        <h1 className="text-2xl font-semibold tracking-tight md:text-3xl">
                            Administração
                        </h1>
                        <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
                            Acompanhe as filas e mantenha a estrutura de
                            atendimento em um só lugar.
                        </p>
                    </div>
                    <Button variant="outline" asChild>
                        <a href="#cadastros">
                            <Settings2 aria-hidden="true" />
                            Gerenciar cadastros
                        </a>
                    </Button>
                </header>

                <section aria-labelledby="metrics-title" className="space-y-3">
                    <h2 id="metrics-title" className="sr-only">
                        Métricas do dia
                    </h2>
                    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4 2xl:grid-cols-7">
                        {metricCards.map((metric) => (
                            <MetricCard key={metric.label} {...metric} />
                        ))}
                    </div>
                </section>

                <TicketFilters
                    filters={filters}
                    units={units}
                    services={services}
                    counters={counters}
                    statusOptions={statusOptions}
                    priorityOptions={priorityOptions}
                    perPage={tickets.per_page}
                />

                <TicketsTable
                    tickets={tickets}
                    selectedBusinessDate={selectedBusinessDate}
                />

                <section id="cadastros" className="scroll-mt-4 space-y-4">
                    <Card>
                        <CardHeader>
                            <CardTitle>Cadastros</CardTitle>
                            <CardDescription>
                                Crie os recursos usados pela operação. As
                                alterações nas listagens abaixo são salvas
                                individualmente.
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                            <CreateUnitDialog />
                            <CreateServiceDialog units={units} />
                            <CreateCounterDialog
                                units={units}
                                services={services}
                            />
                            <CreateUserDialog units={units} />
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader>
                            <CardTitle>Unidades</CardTitle>
                            <CardDescription>
                                Nome, endereço de rota e fuso horário.
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-3">
                            {units.length > 0 ? (
                                units.map((unit) => (
                                    <UnitRow key={unit.id} unit={unit} />
                                ))
                            ) : (
                                <p className="rounded-lg border border-dashed p-6 text-center text-sm text-muted-foreground">
                                    Nenhuma unidade cadastrada.
                                </p>
                            )}
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader>
                            <CardTitle>Serviços e regras da fila</CardTitle>
                            <CardDescription>
                                Edite prefixos e o limite de chamadas
                                prioritárias consecutivas.
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-3">
                            {services.length > 0 ? (
                                services.map((service) => (
                                    <ServiceRow
                                        key={service.id}
                                        service={service}
                                        units={units}
                                    />
                                ))
                            ) : (
                                <p className="rounded-lg border border-dashed p-6 text-center text-sm text-muted-foreground">
                                    Nenhum serviço cadastrado.
                                </p>
                            )}
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader>
                            <CardTitle>Guichês</CardTitle>
                            <CardDescription>
                                Associe cada guichê aos serviços atendidos.
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-3">
                            {counters.length > 0 ? (
                                counters.map((counter) => (
                                    <CounterRow
                                        key={counter.id}
                                        counter={counter}
                                        units={units}
                                        services={services}
                                    />
                                ))
                            ) : (
                                <p className="rounded-lg border border-dashed p-6 text-center text-sm text-muted-foreground">
                                    Nenhum guichê cadastrado.
                                </p>
                            )}
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader>
                            <CardTitle>Usuários</CardTitle>
                            <CardDescription>
                                Perfis administrativos e atendentes associados
                                às unidades.
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-3">
                            {users.length > 0 ? (
                                users.map((user) => (
                                    <UserRow
                                        key={user.id}
                                        user={user}
                                        units={units}
                                    />
                                ))
                            ) : (
                                <p className="rounded-lg border border-dashed p-6 text-center text-sm text-muted-foreground">
                                    Nenhum usuário cadastrado.
                                </p>
                            )}
                        </CardContent>
                    </Card>
                </section>
            </main>
        </>
    );
}

AdminDashboard.layout = {
    breadcrumbs: [
        {
            title: 'Administração',
            href: admin.dashboard(),
        },
    ],
};
