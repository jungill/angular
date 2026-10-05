import { Injectable } from '@angular/core';
import { Observable, Subject, of, throwError, delay } from 'rxjs';

export interface Envelope {
  type: 'message' | 'ack';
  id?: string;
  from?: string;
  to?: string;
  content?: string;
  messageId?: string;
  status?: 'SENT' | 'DELIVERED' | 'READ';
}

const USERS_KEY = 'whatsapp-users';
const PENDING_KEY = 'whatsapp-pending';

@Injectable({ providedIn: 'root' })
export class Chat {
  readonly incoming = new Subject<Envelope>();
  private channel?: BroadcastChannel;
  private me?: string;

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

  connect(token: string) {
    this.me = token;
    this.channel = new BroadcastChannel('whatsapp');
    this.channel.addEventListener('message', (event) =>
      this.receive(event.data as Envelope)
    );
    setTimeout(() => this.deliverPending());
  }

  send(to: string, content: string): string {
    const id = crypto.randomUUID();
    const message: Envelope = { type: 'message', id, from: this.me, to, content };

    setTimeout(() => {
      this.savePending(message);
      this.incoming.next({ type: 'ack', messageId: id, status: 'SENT' });
      this.channel?.postMessage(message);
    }, 200);

    return id;
  }

  private receive(e: Envelope) {
    if (e.to !== this.me) return;
    if (e.type === 'message') {
      this.deliver(e);
    } else {
      this.incoming.next(e);
    }
  }

  private deliver(message: Envelope) {
    this.removePending(message.id!);
    this.incoming.next(message);
    this.channel?.postMessage({
      type: 'ack',
      messageId: message.id,
      status: 'DELIVERED',
      to: message.from
    });
  }

  private deliverPending() {
    this.readPending()
      .filter((m) => m.to === this.me)
      .forEach((m) => this.deliver(m));
  }

  private readUsers(): Record<string, string> {
    return JSON.parse(localStorage.getItem(USERS_KEY) ?? '{}');
  }

  private readPending(): Envelope[] {
    return JSON.parse(localStorage.getItem(PENDING_KEY) ?? '[]');
  }

  private savePending(message: Envelope) {
    const pending = this.readPending();
    pending.push(message);
    localStorage.setItem(PENDING_KEY, JSON.stringify(pending));
  }

  private removePending(id: string) {
    const pending = this.readPending().filter((m) => m.id !== id);
    localStorage.setItem(PENDING_KEY, JSON.stringify(pending));
  }
}