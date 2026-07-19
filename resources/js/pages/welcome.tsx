import { Head, Link, usePage } from '@inertiajs/react';
import { ArrowRight, Headphones, Monitor, TicketCheck } from 'lucide-react';
import { login } from '@/routes';
import { index as attendantIndex } from '@/routes/attendant';
import { show as displayShow } from '@/routes/display';
import { show as kioskShow } from '@/routes/kiosk';
import type { Auth, Unit } from '@/types';

type Props = { units: Unit[] };

export default function Welcome({ units }: Props) {
    const { auth } = usePage<{ auth: Auth }>().props;
    const firstUnit = units[0];

    return (
        <>
            <Head title="Início" />
            <main className="min-h-screen bg-[#f3efe5] text-slate-950">
                <div className="mx-auto flex min-h-screen max-w-7xl flex-col px-6 py-8 lg:px-12">
                    <header className="flex items-center justify-between border-b border-slate-900/15 pb-6">
                        <div>
                            <p className="text-xs font-bold tracking-[0.24em] text-amber-700 uppercase">
                                Fila organizada, atendimento humano
                            </p>
                            <p className="mt-1 text-lg font-black">Chamador</p>
                        </div>
                        <Link
                            href={auth.user ? attendantIndex() : login()}
                            className="rounded-full bg-slate-950 px-5 py-2.5 text-sm font-bold text-white focus-visible:outline-2 focus-visible:outline-offset-2"
                        >
                            {auth.user
                                ? 'Ir para atendimento'
                                : 'Entrar no sistema'}
                        </Link>
                    </header>

                    <section className="grid flex-1 items-center gap-12 py-16 lg:grid-cols-[1.25fr_0.75fr]">
                        <div>
                            <p className="mb-5 inline-flex rounded-full border border-amber-700/30 bg-amber-100 px-4 py-2 text-sm font-semibold text-amber-900">
                                Senhas persistentes, chamadas em tempo real
                            </p>
                            <h1 className="max-w-4xl text-5xl leading-[0.98] font-black tracking-tight sm:text-7xl">
                                Cada pessoa sabe quando e onde será atendida.
                            </h1>
                            <p className="mt-7 max-w-2xl text-lg leading-8 text-slate-700">
                                Totem, guichê e painel público trabalham sobre a
                                mesma fila segura, com prioridade configurável e
                                histórico completo.
                            </p>
                        </div>

                        <div className="grid gap-4">
                            {firstUnit ? (
                                <>
                                    <AccessCard
                                        href={kioskShow(firstUnit)}
                                        icon={TicketCheck}
                                        title="Emitir senha"
                                        description={`Totem da ${firstUnit.name}`}
                                    />
                                    <AccessCard
                                        href={displayShow(firstUnit)}
                                        icon={Monitor}
                                        title="Abrir painel público"
                                        description="Visualização para TV e recepção"
                                    />
                                </>
                            ) : (
                                <div className="rounded-3xl border border-slate-900/10 bg-white p-7">
                                    Nenhuma unidade ativa foi configurada.
                                </div>
                            )}
                            <AccessCard
                                href={auth.user ? attendantIndex() : login()}
                                icon={Headphones}
                                title="Área do atendente"
                                description="Chamar e conduzir atendimentos"
                                dark
                            />
                        </div>
                    </section>

                    <footer className="border-t border-slate-900/15 pt-5 text-sm text-slate-600">
                        Evolução do protótipo original em JavaScript puro, agora
                        com Laravel e React.
                    </footer>
                </div>
            </main>
        </>
    );
}

function AccessCard({
    href,
    icon: Icon,
    title,
    description,
    dark = false,
}: {
    href: ReturnType<typeof login>;
    icon: typeof TicketCheck;
    title: string;
    description: string;
    dark?: boolean;
}) {
    return (
        <Link
            href={href}
            className={`group flex min-h-32 items-center gap-5 rounded-3xl border p-6 transition-transform motion-safe:hover:-translate-y-1 ${dark ? 'border-slate-950 bg-slate-950 text-white' : 'border-slate-900/10 bg-white'}`}
        >
            <span
                className={`grid size-12 shrink-0 place-items-center rounded-2xl ${dark ? 'bg-white/10' : 'bg-amber-100 text-amber-800'}`}
            >
                <Icon aria-hidden className="size-6" />
            </span>
            <span className="flex-1">
                <strong className="block text-lg">{title}</strong>
                <span
                    className={`text-sm ${dark ? 'text-slate-300' : 'text-slate-600'}`}
                >
                    {description}
                </span>
            </span>
            <ArrowRight
                aria-hidden
                className="size-5 transition-transform group-hover:translate-x-1"
            />
        </Link>
    );
}
