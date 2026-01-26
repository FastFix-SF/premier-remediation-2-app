import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Fetch JSON file from GitHub
async function fetchGitHubFile(
  owner: string,
  repo: string,
  path: string,
  token: string
): Promise<{ content: any; sha: string } | null> {
  try {
    const response = await fetch(
      `https://api.github.com/repos/${owner}/${repo}/contents/${path}`,
      {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Accept': 'application/vnd.github.v3+json',
        }
      }
    );

    if (!response.ok) {
      console.error('GitHub fetch error:', response.status);
      return null;
    }

    const data = await response.json();
    const content = JSON.parse(atob(data.content.replace(/\n/g, '')));
    return { content, sha: data.sha };
  } catch (err) {
    console.error('GitHub fetch error:', err);
    return null;
  }
}

// Update JSON file in GitHub
async function updateGitHubFile(
  owner: string,
  repo: string,
  path: string,
  content: any,
  sha: string,
  message: string,
  token: string
): Promise<boolean> {
  try {
    const response = await fetch(
      `https://api.github.com/repos/${owner}/${repo}/contents/${path}`,
      {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Accept': 'application/vnd.github.v3+json',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message,
          content: btoa(JSON.stringify(content, null, 2)),
          sha,
          branch: 'main'
        })
      }
    );

    return response.ok;
  } catch (err) {
    console.error('GitHub update error:', err);
    return false;
  }
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { serviceSlug, imageUrl, areaSlug } = await req.json();

    if (!imageUrl) {
      return new Response(
        JSON.stringify({ error: 'imageUrl is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const GITHUB_TOKEN = Deno.env.get('GITHUB_TOKEN');
    if (!GITHUB_TOKEN) {
      return new Response(
        JSON.stringify({ error: 'GITHUB_TOKEN not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const owner = 'FastFix-SF';
    const repo = 'premier-remediation-2-app';

    // Update service image
    if (serviceSlug) {
      const servicesFile = await fetchGitHubFile(owner, repo, 'src/config/services.json', GITHUB_TOKEN);
      if (!servicesFile) {
        return new Response(
          JSON.stringify({ error: 'Failed to fetch services.json' }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Find and update the service
      const services = servicesFile.content;
      const serviceIndex = services.findIndex((s: any) => s.slug === serviceSlug);

      if (serviceIndex === -1) {
        return new Response(
          JSON.stringify({ error: `Service not found: ${serviceSlug}` }),
          { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      services[serviceIndex].image = imageUrl;
      services[serviceIndex].heroImage = imageUrl;  // Update both fields!

      const updateSuccess = await updateGitHubFile(
        owner, repo,
        'src/config/services.json',
        services,
        servicesFile.sha,
        `[Admin] Update hero image for ${services[serviceIndex].name}`,
        GITHUB_TOKEN
      );

      if (!updateSuccess) {
        return new Response(
          JSON.stringify({ error: 'Failed to update GitHub' }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      return new Response(
        JSON.stringify({ success: true, message: `Updated image for ${services[serviceIndex].name}` }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Update area image
    if (areaSlug) {
      const areasFile = await fetchGitHubFile(owner, repo, 'src/config/areas.json', GITHUB_TOKEN);
      if (!areasFile) {
        return new Response(
          JSON.stringify({ error: 'Failed to fetch areas.json' }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const areas = areasFile.content;
      const areaIndex = areas.findIndex((a: any) => a.slug === areaSlug);

      if (areaIndex === -1) {
        return new Response(
          JSON.stringify({ error: `Area not found: ${areaSlug}` }),
          { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      areas[areaIndex].image = imageUrl;
      areas[areaIndex].heroImage = imageUrl;

      const updateSuccess = await updateGitHubFile(
        owner, repo,
        'src/config/areas.json',
        areas,
        areasFile.sha,
        `[Admin] Update hero image for ${areas[areaIndex].name}`,
        GITHUB_TOKEN
      );

      if (!updateSuccess) {
        return new Response(
          JSON.stringify({ error: 'Failed to update GitHub' }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      return new Response(
        JSON.stringify({ success: true, message: `Updated image for ${areas[areaIndex].name}` }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify({ error: 'Either serviceSlug or areaSlug is required' }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in update-service-image:', error);
    return new Response(
      JSON.stringify({
        error: error instanceof Error ? error.message : 'Failed to update image'
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
