import { Card, Empty, Button } from '@/design/ui'
export default function NotFound() {
  return <Card><Empty title="Page not found" body="That page doesn’t exist in this demo." action={<Button to="/">Go home</Button>} /></Card>
}
