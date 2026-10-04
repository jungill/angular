import { Injectable } from '@angular/core';
import { Observable, of, throwError, delay } from 'rxjs';

const USERS_KEY = 'whatsapp-users';

@Injectable({ providedIn: 'root' })
export class Chat {

  login(username: string, password: string): Observable<{ token: string }> {
    const users = this.readUsers();
    if (users[username] !== password) {
      return throwError(() => ({ status: 401 }));
    }
    return of({ token: username }).pipe(delay(300));
  }

  register(username: string, password: string): Observable<{ token: string }> {
    const users = this.readUsers();
    if (users[username] !== undefined) {
      return throwError(() => ({ status: 409 }));
    }
    users[username] = password;
    localStorage.setItem(USERS_KEY, JSON.stringify(users));
    return of({ token: username }).pipe(delay(300));
  }

  private readUsers(): Record<string, string> {
    return JSON.parse(localStorage.getItem(USERS_KEY) ?? '{}');
  }

  send(to: string, content: string): string {
    const id = crypto.randomUUID();
    return id;
  }
}