import { Button } from "@/components/ui/button";

const Index = () => {
  return (
    <div className="min-h-screen bg-gradient-background flex items-center justify-center px-4">
      <div className="text-center max-w-2xl mx-auto">
        <div className="space-y-6">
          <h1 className="text-6xl md:text-7xl font-bold tracking-tight bg-gradient-primary bg-clip-text text-transparent">
            Placeholder Hub
          </h1>
          <p className="text-xl md:text-2xl text-muted-foreground font-light">
            This space is under construction
          </p>
          <div className="pt-8">
            <Button 
              variant="hero" 
              className="transform transition-transform hover:scale-105"
              onClick={() => {}}
            >
              Notify Me
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Index;
