<!DOCTYPE html>
<html class="h-full">
<head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <link rel="icon" type="image/svg+xml" href="/favicon.svg">

    {{-- Fonts --}}
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap" rel="stylesheet">

    @vite('resources/js/app.js')
    @inertiaHead
</head>
<body class="font-sans leading-none text-gray-700 antialiased" style="font-family: 'Inter', sans-serif;">
    @inertia
</body>
</html>
