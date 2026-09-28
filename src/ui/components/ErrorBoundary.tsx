// אם מסך נשבר: הודעה ברורה במקום מסך ריק. הנתונים לא נפגעים
import { Component, type ComponentChildren } from 'preact';

export class ErrorBoundary extends Component<{ children: ComponentChildren; resetKey: string }, { error: Error | null }> {
  state = { error: null as Error | null };
  static getDerivedStateFromError(error: Error) {
    return { error };
  }
  componentDidCatch(error: Error) {
    console.error(error);
  }
  componentDidUpdate(prev: { resetKey: string }) {
    if (prev.resetKey !== this.props.resetKey && this.state.error) this.setState({ error: null });
  }
  render() {
    if (this.state.error) {
      return (
        <div class="card">
          <h2>משהו השתבש במסך הזה</h2>
          <p class="small">הנתונים שלך שמורים. נסה לחזור לדשבורד. אם זה חוזר, שלח צילום של ההודעה:</p>
          <pre class="small en" style={{ whiteSpace: 'pre-wrap' }}>{this.state.error.message}</pre>
          <a class="btn primary block" href="#/dashboard">לדשבורד</a>
        </div>
      );
    }
    return this.props.children;
  }
}
