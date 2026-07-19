import { Link, usePage } from '@inertiajs/react';
import { Headphones, Settings2 } from 'lucide-react';
import AppLogo from '@/components/app-logo';
import { NavFooter } from '@/components/nav-footer';
import { NavMain } from '@/components/nav-main';
import { NavUser } from '@/components/nav-user';
import {
    Sidebar,
    SidebarContent,
    SidebarFooter,
    SidebarHeader,
    SidebarMenu,
    SidebarMenuButton,
    SidebarMenuItem,
} from '@/components/ui/sidebar';
import { dashboard as adminDashboard } from '@/routes/admin';
import { index as attendantIndex } from '@/routes/attendant';
import type { NavItem, Auth } from '@/types';

const footerNavItems: NavItem[] = [
    {
        title: 'Código-fonte',
        href: 'https://github.com/jonas-amilton/sistema-chamador-de-senhas',
        icon: Settings2,
    },
];

export function AppSidebar() {
    const { auth } = usePage<{ auth: Auth }>().props;
    const mainNavItems: NavItem[] = [
        {
            title: 'Atendimento',
            href: attendantIndex(),
            icon: Headphones,
        },
        ...(auth.user.role === 'admin'
            ? [
                  {
                      title: 'Administração',
                      href: adminDashboard(),
                      icon: Settings2,
                  },
              ]
            : []),
    ];

    return (
        <Sidebar collapsible="icon" variant="inset">
            <SidebarHeader>
                <SidebarMenu>
                    <SidebarMenuItem>
                        <SidebarMenuButton size="lg" asChild>
                            <Link href={attendantIndex()} prefetch>
                                <AppLogo />
                            </Link>
                        </SidebarMenuButton>
                    </SidebarMenuItem>
                </SidebarMenu>
            </SidebarHeader>

            <SidebarContent>
                <NavMain items={mainNavItems} />
            </SidebarContent>

            <SidebarFooter>
                <NavFooter items={footerNavItems} className="mt-auto" />
                <NavUser />
            </SidebarFooter>
        </Sidebar>
    );
}
