import { Routes } from '@angular/router';
import { Login } from './features/auth/login/login';
import { Home } from './features/auth/components/home/home';
import { Register } from './features/auth/register/register';

export const routes: Routes = [
    { path: '', redirectTo: 'login', pathMatch: 'full' },
    { path: 'login', component: Login },
    { path: 'register', component: Register },
    { path: 'home', component: Home },
    { path: '**', redirectTo: 'login' }
];
