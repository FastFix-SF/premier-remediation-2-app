import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Plus, Trash2, Edit2, DollarSign, Star, Package } from 'lucide-react';
import { useProposalManagement, ProposalPricing } from '@/hooks/useProposalManagement';
import { cn } from '@/lib/utils';

interface PricingTableProps {
  proposalId?: string;
  isEditing: boolean;
}

export const PricingTable: React.FC<PricingTableProps> = ({
  proposalId,
  isEditing
}) => {
  const { 
    fetchProposalPricing,
    fetchProposalQuotes,
    addPricingItem, 
    updatePricingItem, 
    deletePricingItem 
  } = useProposalManagement();
  
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<ProposalPricing | null>(null);
  const [formData, setFormData] = useState({
    system_name: '',
    description: '',
    quantity: 1,
    unit_price: 0,
    is_recommended: false,
    is_optional: false
  });

  const { data: pricingItems = [] } = useQuery({
    queryKey: ['proposal-pricing', proposalId],
    queryFn: () => proposalId ? fetchProposalPricing(proposalId) : Promise.resolve([]),
    enabled: !!proposalId
  });

  const { data: quotes = [] } = useQuery({
    queryKey: ['proposal-quotes', proposalId],
    queryFn: () => proposalId ? fetchProposalQuotes(proposalId) : Promise.resolve([]),
    enabled: !!proposalId
  });

  const resetForm = () => {
    setFormData({
      system_name: '',
      description: '',
      quantity: 1,
      unit_price: 0,
      is_recommended: false,
      is_optional: false
    });
    setEditingItem(null);
  };

  const handleSave = async () => {
    if (!proposalId) return;

    try {
      if (editingItem) {
        await updatePricingItem.mutateAsync({
          pricingId: editingItem.id,
          updates: formData
        });
      } else {
        await addPricingItem.mutateAsync({
          proposal_id: proposalId,
          ...formData,
          display_order: pricingItems.length
        });
      }
      setIsAddDialogOpen(false);
      resetForm();
    } catch (error) {
      console.error('Error saving pricing item:', error);
    }
  };

  const handleEdit = (item: ProposalPricing) => {
    setEditingItem(item);
    setFormData({
      system_name: item.system_name,
      description: item.description || '',
      quantity: item.quantity,
      unit_price: item.unit_price,
      is_recommended: item.is_recommended,
      is_optional: item.is_optional
    });
    setIsAddDialogOpen(true);
  };

  const handleDelete = async (itemId: string) => {
    try {
      await deletePricingItem.mutateAsync(itemId);
    } catch (error) {
      console.error('Error deleting pricing item:', error);
    }
  };

  const totalPrice = pricingItems
    .filter(item => !item.is_optional)
    .reduce((sum, item) => sum + item.total_price, 0);

  const optionalItemsTotal = pricingItems
    .filter(item => item.is_optional)
    .reduce((sum, item) => sum + item.total_price, 0);

  const roofingSystemTemplates = [
    {
      name: 'TPO Single-Ply System',
      description: 'Premium TPO membrane system with polyiso insulation',
      basePrice: 12.50
    },
    {
      name: 'Modified Bitumen 2-Ply',
      description: 'SBS modified bitumen base and cap sheet system',
      basePrice: 10.75
    },
    {
      name: 'Standing Seam Metal',
      description: '24-gauge steel standing seam roofing system',
      basePrice: 18.00
    },
    {
      name: 'EPDM Rubber Membrane',
      description: 'Single-ply EPDM rubber roofing system',
      basePrice: 8.50
    }
  ];

  return (
    <Card className="overflow-hidden">
      <CardHeader className="bg-gradient-to-r from-primary/5 to-transparent pb-2">
        <CardTitle className="flex items-center justify-between text-base">
          <div className="flex items-center gap-2">
            <DollarSign className="h-4 w-4 text-primary" />
            Investment Options
          </div>
          {isEditing && proposalId && (
            <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
              <DialogTrigger asChild>
                <Button size="sm" onClick={resetForm} className="h-7 text-xs">
                  <Plus className="h-3 w-3 mr-1" />
                  Add Option
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl">
                <DialogHeader>
                  <DialogTitle>
                    {editingItem ? 'Edit Pricing Option' : 'Add Pricing Option'}
                  </DialogTitle>
                </DialogHeader>
                
                <div className="grid grid-cols-2 gap-4">
                  <div className="col-span-2">
                    <Label>Quick Templates</Label>
                    <div className="grid grid-cols-2 gap-2 mt-2">
                      {roofingSystemTemplates.map((template) => (
                        <Button
                          key={template.name}
                          variant="outline"
                          size="sm"
                          onClick={() => setFormData(prev => ({
                            ...prev,
                            system_name: template.name,
                            description: template.description,
                            unit_price: template.basePrice
                          }))}
                        >
                          {template.name}
                        </Button>
                      ))}
                    </div>
                  </div>
                  
                  <div className="col-span-2">
                    <Label htmlFor="system_name">System Name</Label>
                    <Input
                      id="system_name"
                      value={formData.system_name}
                      onChange={(e) => setFormData(prev => ({ ...prev, system_name: e.target.value }))}
                      placeholder="e.g., TPO Single-Ply System"
                    />
                  </div>
                  
                  <div className="col-span-2">
                    <Label htmlFor="description">Description</Label>
                    <Input
                      id="description"
                      value={formData.description}
                      onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                      placeholder="Brief description of materials and installation"
                    />
                  </div>
                  
                  <div>
                    <Label htmlFor="quantity">Quantity</Label>
                    <Input
                      id="quantity"
                      type="number"
                      value={formData.quantity}
                      onChange={(e) => setFormData(prev => ({ ...prev, quantity: parseFloat(e.target.value) || 0 }))}
                      placeholder="Square feet"
                    />
                  </div>
                  
                  <div>
                    <Label htmlFor="unit_price">Price per Sq Ft</Label>
                    <Input
                      id="unit_price"
                      type="number"
                      step="0.01"
                      value={formData.unit_price}
                      onChange={(e) => setFormData(prev => ({ ...prev, unit_price: parseFloat(e.target.value) || 0 }))}
                      placeholder="12.50"
                    />
                  </div>
                  
                  <div className="col-span-2 flex gap-4">
                    <div className="flex items-center space-x-2">
                      <Checkbox
                        id="is_recommended"
                        checked={formData.is_recommended}
                        onCheckedChange={(checked) => setFormData(prev => ({ ...prev, is_recommended: !!checked }))}
                      />
                      <Label htmlFor="is_recommended" className="text-sm">Recommended Option</Label>
                    </div>
                    
                    <div className="flex items-center space-x-2">
                      <Checkbox
                        id="is_optional"
                        checked={formData.is_optional}
                        onCheckedChange={(checked) => setFormData(prev => ({ ...prev, is_optional: !!checked }))}
                      />
                      <Label htmlFor="is_optional" className="text-sm">Optional Add-on</Label>
                    </div>
                  </div>
                </div>
                
                <div className="flex justify-end gap-2 pt-4">
                  <Button variant="outline" onClick={() => setIsAddDialogOpen(false)}>
                    Cancel
                  </Button>
                  <Button onClick={handleSave} disabled={!formData.system_name || formData.unit_price <= 0}>
                    {editingItem ? 'Update' : 'Add'} Option
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="pt-3">
        {quotes.length > 0 ? (
          <div className="space-y-3">
            {quotes.map((quote: any) => (
              <div
                key={quote.id}
                className="flex items-center justify-between bg-muted/50 px-4 py-3 rounded-lg border"
              >
                <div className="flex-1">
                  <div className="font-semibold text-sm">{quote.option_name}</div>
                </div>
                <div className="flex items-center gap-3">
                  <div className="text-right">
                    <div className="font-bold text-lg text-primary">
                      ${quote.total_amount.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                    </div>
                  </div>
                  <Badge variant="outline" className="text-xs capitalize">
                    {quote.status}
                  </Badge>
                </div>
              </div>
            ))}
          </div>
        ) : pricingItems.length > 0 ? (
          <div className="space-y-4">
            {/* Main Pricing Options */}
            <div>
              <h3 className="text-sm font-semibold mb-2">Roofing System Options</h3>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="text-xs">
                      <TableHead className="h-8">System</TableHead>
                      <TableHead className="h-8">Description</TableHead>
                      <TableHead className="text-right h-8">Quantity</TableHead>
                      <TableHead className="text-right h-8">Price/Sq Ft</TableHead>
                      <TableHead className="text-right h-8">Total</TableHead>
                      {isEditing && <TableHead className="w-16 h-8">Actions</TableHead>}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {pricingItems.filter(item => !item.is_optional).map((item) => (
                      <TableRow key={item.id} className={cn(item.is_recommended && "bg-primary/5", "text-xs")}>
                        <TableCell className="py-2">
                          <div className="flex items-center gap-1">
                            <span className="font-medium text-xs">{item.system_name}</span>
                            {item.is_recommended && (
                              <Badge className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200 text-xs h-4">
                                <Star className="h-2 w-2 mr-0.5" />
                                Rec
                              </Badge>
                            )}
                          </div>
                        </TableCell>
                        <TableCell className="text-muted-foreground text-xs py-2">
                          {item.description || 'No description'}
                        </TableCell>
                        <TableCell className="text-right font-mono text-xs py-2">
                          {item.quantity.toLocaleString()} sq ft
                        </TableCell>
                        <TableCell className="text-right font-mono text-xs py-2">
                          ${item.unit_price.toFixed(2)}
                        </TableCell>
                        <TableCell className="text-right font-mono font-semibold text-xs py-2">
                          ${item.total_price.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                        </TableCell>
                        {isEditing && (
                          <TableCell className="py-2">
                            <div className="flex gap-0.5">
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => handleEdit(item)}
                                className="h-6 w-6 p-0"
                              >
                                <Edit2 className="h-2.5 w-2.5" />
                              </Button>
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => handleDelete(item.id)}
                                className="h-6 w-6 p-0"
                              >
                                <Trash2 className="h-2.5 w-2.5" />
                              </Button>
                            </div>
                          </TableCell>
                        )}
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </div>

            {/* Optional Add-ons */}
            {pricingItems.some(item => item.is_optional) && (
              <div>
                <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                  <Package className="h-5 w-5" />
                  Optional Add-ons
                </h3>
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Add-on</TableHead>
                        <TableHead>Description</TableHead>
                        <TableHead className="text-right">Quantity</TableHead>
                        <TableHead className="text-right">Price/Unit</TableHead>
                        <TableHead className="text-right">Total</TableHead>
                        {isEditing && <TableHead className="w-20">Actions</TableHead>}
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {pricingItems.filter(item => item.is_optional).map((item) => (
                        <TableRow key={item.id}>
                          <TableCell className="font-medium">{item.system_name}</TableCell>
                          <TableCell className="text-muted-foreground">
                            {item.description || 'No description'}
                          </TableCell>
                          <TableCell className="text-right font-mono">
                            {item.quantity.toLocaleString()}
                          </TableCell>
                          <TableCell className="text-right font-mono">
                            ${item.unit_price.toFixed(2)}
                          </TableCell>
                          <TableCell className="text-right font-mono">
                            ${item.total_price.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                          </TableCell>
                          {isEditing && (
                            <TableCell>
                              <div className="flex gap-1">
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  onClick={() => handleEdit(item)}
                                >
                                  <Edit2 className="h-3 w-3" />
                                </Button>
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  onClick={() => handleDelete(item.id)}
                                >
                                  <Trash2 className="h-3 w-3" />
                                </Button>
                              </div>
                            </TableCell>
                          )}
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </div>
            )}

            {/* Professional Project Summary */}
            <div className="bg-gradient-to-r from-primary/5 to-transparent rounded-lg p-6 mt-8 border">
              <h3 className="text-xl font-semibold mb-6 text-center">Investment Summary</h3>
              
              {/* Main Project Line */}
              <div className="bg-white dark:bg-card border rounded-lg overflow-hidden mb-6">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-muted/50">
                      <TableHead className="font-semibold text-left">Project</TableHead>
                      <TableHead className="text-right font-semibold">Total</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    <TableRow>
                      <TableCell className="font-medium py-4">
                        {pricingItems.find(item => !item.is_optional)?.system_name || 'Roofing Project'}
                      </TableCell>
                      <TableCell className="text-right font-bold text-2xl py-4 text-primary">
                        ${totalPrice.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                      </TableCell>
                    </TableRow>
                  </TableBody>
                </Table>
              </div>

              {/* Pricing Breakdown */}
              <div className="max-w-sm ml-auto bg-white dark:bg-card rounded-lg border p-6">
                <div className="space-y-4">
                  <div className="flex justify-between text-lg">
                    <span>Subtotal</span>
                    <span className="font-mono">${totalPrice.toLocaleString('en-US', { minimumFractionDigits: 2 })}</span>
                  </div>
                  
                  {optionalItemsTotal > 0 && (
                    <div className="flex justify-between text-muted-foreground">
                      <span>Optional Add-ons</span>
                      <span className="font-mono">+${optionalItemsTotal.toLocaleString('en-US', { minimumFractionDigits: 2 })}</span>
                    </div>
                  )}
                  
                  <div className="flex justify-between text-muted-foreground">
                    <span>Tax: (0%)</span>
                    <span className="font-mono">$0.00</span>
                  </div>
                  
                  <Separator />
                  
                  <div className="flex justify-between text-xl font-bold">
                    <span>Total</span>
                    <span className="font-mono text-2xl text-primary">
                      ${(totalPrice + optionalItemsTotal).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                    </span>
                  </div>
                </div>
              </div>

              <div className="text-center pt-6 space-y-3">
                <Badge className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200 text-sm py-2 px-4">
                  ✓ Professional Installation Included
                </Badge>
                <div className="text-center space-y-2">
                  <p className="text-sm text-muted-foreground">
                    💳 Financing available • 🛡️ Warranty included • 📞 24/7 support
                  </p>
                  <div className="text-xs text-muted-foreground">
                    Price valid for 30 days
                  </div>
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="text-center py-12 text-muted-foreground">
            <DollarSign className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>No investment options available yet</p>
            {isEditing && <p className="text-sm mt-1">Add quote options to get started</p>}
          </div>
        )}
      </CardContent>
    </Card>
  );
};