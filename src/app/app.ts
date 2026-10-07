import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Chat, Envelope } from './chat';
import { Subscription } from 'rxjs';

interface DisplayedMessage {
  id: string;
  from: string;
  content: string;
  status?: string;
  mine: boolean;
}

type View = 'login' | 'register' | 'chat';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './app.html',
  styleUrl: './app.css'
})
export class App {
  view: View = 'login';

  username = '';
  password = '';
  passwordConfirm = '';
  recipient = '';
  draft = '';
  error = '';
  messages: DisplayedMessage[] = [];
  private subscription?: Subscription;

  constructor(private chat: Chat) {}

  goTo(view: View) {
    this.view = view;
    this.error = '';
    this.password = '';
    this.passwordConfirm = '';
  }

  doLogin() {
    this.error = '';
    if (!this.username.trim() || !this.password) {
      this.error = 'Identifiant et mot de passe requis';
      return;
    }
    this.chat.login(this.username, this.password).subscribe({
      next: (res) => this.onToken(res.token),
      error: () => (this.error = 'Identifiants invalides')
    });
  }

  doRegister() {
    this.error = '';
    if (!this.username.trim() || !this.password) {
      this.error = 'Identifiant et mot de passe requis';
      return;
    }
    if (this.password !== this.passwordConfirm) {
      this.error = 'Les mots de passe ne correspondent pas';
      return;
    }
    this.chat.register(this.username, this.password).subscribe({
      next: (res) => this.onToken(res.token),
      error: (err) =>
        (this.error =
          err.status === 409
            ? 'Cet identifiant est deja pris'
            : 'Inscription impossible')
    });
  }

  logout() {
    this.subscription?.unsubscribe();
    this.subscription = undefined;
    this.chat.disconnect();

    this.messages = [];
    this.recipient = '';
    this.draft = '';
    this.password = '';
    this.passwordConfirm = '';
    this.error = '';
    this.view = 'login';
  }

  private onToken(token: string) {
    this.chat.connect(token);
    this.subscription = this.chat.incoming.subscribe((e) => this.handle(e));
    this.password = '';
    this.passwordConfirm = '';
    this.view = 'chat';
  }

  private handle(e: Envelope) {
    if (e.type === 'message') {
      this.messages.push({
        id: e.id!,
        from: e.from!,
        content: e.content!,
        mine: false
      });
    } else if (e.type === 'ack') {
      const target = this.messages.find((m) => m.id === e.messageId);
      if (target) target.status = e.status;
    }
  }

  send() {
    if (!this.draft.trim() || !this.recipient.trim()) return;
    const id = this.chat.send(this.recipient, this.draft);
    this.messages.push({
      id,
      from: this.username,
      content: this.draft,
      mine: true
    });
    this.draft = '';
  }

  tick(status?: string): string {
    if (status === 'DELIVERED' || status === 'DELIVERY_NOTIFIED') return '✓✓';
    if (status === 'SENT') return '✓';
    return '';
  }
}