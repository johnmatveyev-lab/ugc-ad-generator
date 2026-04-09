import React, { useRef, useEffect } from 'react';

interface Particle {
  x: number;
  y: number;
  size: number;
  vx: number;
  vy: number;
  baseColor: string;
}

const InteractiveBackground: React.FC = () => {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const mouse = useRef<{ x: number | null; y: number | null }>({ x: null, y: null });
    const particles = useRef<Particle[]>([]);
    
    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        let animationFrameId: number;

        const setup = () => {
            canvas.width = window.innerWidth;
            canvas.height = window.innerHeight;
            particles.current = [];
            const numberOfParticles = Math.floor((canvas.width * canvas.height) / 18000);
            const colors = ['#D946EF', '#8B5CF6', '#38BDF8']; // Fuchsia, Indigo, Sky

            for (let i = 0; i < numberOfParticles; i++) {
                particles.current.push({
                    x: Math.random() * canvas.width,
                    y: Math.random() * canvas.height,
                    size: Math.random() * 2 + 1,
                    vx: (Math.random() - 0.5) * 0.5,
                    vy: (Math.random() - 0.5) * 0.5,
                    baseColor: colors[i % colors.length],
                });
            }
        };

        const draw = () => {
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            const isDarkMode = document.documentElement.classList.contains('dark');
            const connectLineColorBase = isDarkMode ? '167, 139, 250' : '139, 92, 246'; // Faint purple for dark, stronger for light
            const mouseLineColorBase = '139, 92, 246'; // Thematic Purple/Indigo

            particles.current.forEach(p => {
                // Update position
                p.x += p.vx;
                p.y += p.vy;

                // Wall collision
                if (p.x - p.size < 0 || p.x + p.size > canvas.width) p.vx *= -1;
                if (p.y - p.size < 0 || p.y + p.size > canvas.height) p.vy *= -1;
                
                // Draw particle
                ctx.fillStyle = p.baseColor;
                ctx.beginPath();
                ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
                ctx.fill();
            });

            // Connect nearby particles and interact with mouse
            for (let i = 0; i < particles.current.length; i++) {
                const p1 = particles.current[i];

                // Mouse interaction
                if (mouse.current.x && mouse.current.y) {
                    const dx = p1.x - mouse.current.x;
                    const dy = p1.y - mouse.current.y;
                    const distance = Math.sqrt(dx * dx + dy * dy);
                    const maxDistance = 150;
                    
                    if (distance < maxDistance) {
                        // Simple push effect
                        const pushFactor = (1 - distance / maxDistance) * 0.5;
                        p1.x += (dx / distance) * pushFactor;
                        p1.y += (dy / distance) * pushFactor;

                        // Draw line to mouse
                        const opacity = Math.min(0.8, 1 - distance / maxDistance);
                        ctx.strokeStyle = `rgba(${mouseLineColorBase}, ${opacity})`;
                        ctx.lineWidth = 1;
                        ctx.beginPath();
                        ctx.moveTo(mouse.current.x, mouse.current.y);
                        ctx.lineTo(p1.x, p1.y);
                        ctx.stroke();
                    }
                }
                
                // Particle connections
                for (let j = i; j < particles.current.length; j++) {
                    const p2 = particles.current[j];
                    const dx = p1.x - p2.x;
                    const dy = p1.y - p2.y;
                    const distance = Math.sqrt(dx * dx + dy * dy);
                    if (distance < 120) {
                        ctx.strokeStyle = `rgba(${connectLineColorBase}, ${0.7 - distance / 120})`;
                        ctx.lineWidth = 0.5;
                        ctx.beginPath();
                        ctx.moveTo(p1.x, p1.y);
                        ctx.lineTo(p2.x, p2.y);
                        ctx.stroke();
                    }
                }
            }
            
            animationFrameId = requestAnimationFrame(draw);
        };
        
        const handleResize = () => {
            cancelAnimationFrame(animationFrameId);
            setup();
            draw();
        };

        const handleMouseMove = (e: MouseEvent) => {
            mouse.current.x = e.clientX;
            mouse.current.y = e.clientY;
        };
        
        const handleMouseOut = () => {
            mouse.current.x = null;
            mouse.current.y = null;
        }

        setup();
        draw();
        
        window.addEventListener('resize', handleResize);
        window.addEventListener('mousemove', handleMouseMove);
        window.addEventListener('mouseout', handleMouseOut);

        return () => {
            cancelAnimationFrame(animationFrameId);
            window.removeEventListener('resize', handleResize);
            window.removeEventListener('mousemove', handleMouseMove);
            window.removeEventListener('mouseout', handleMouseOut);
        };
    }, []);

    return <canvas ref={canvasRef} style={{ position: 'absolute', top: 0, left: 0, zIndex: 0 }} />;
};

export default InteractiveBackground;