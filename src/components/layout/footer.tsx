export default function Footer() {
  return (
    <footer className="bg-muted py-8 border-t">
      <div className="container mx-auto px-4 text-center text-muted-foreground">
        <p>&copy; {new Date().getFullYear()} FundiConnect. All rights reserved.</p>
        <p className="text-sm mt-2">Connecting you with trusted artisans across Kenya.</p>
        <div className="mt-4 flex justify-center space-x-4">
          <a href="#" className="hover:text-primary">Privacy Policy</a>
          <a href="#" className="hover:text-primary">Terms of Service</a>
        </div>
      </div>
    </footer>
  );
}
