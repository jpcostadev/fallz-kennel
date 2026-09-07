import { Modal, Pressable, Text, View } from 'react-native'
import { colors, common } from './theme'

export function ThemedDialog({visible,title,message,onClose,onConfirm,confirmLabel='OK',danger=false}:{visible:boolean;title:string;message:string;onClose:()=>void;onConfirm?:()=>void;confirmLabel?:string;danger?:boolean}){
  return <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}><View style={common.modalBackdrop}><View style={[common.card,{width:'88%',maxWidth:430,padding:22}]}><Text style={{color:colors.text,fontSize:21,fontWeight:'900'}}>{title}</Text><Text style={[common.muted,{fontSize:15,lineHeight:22,marginTop:10,marginBottom:20}]}>{message}</Text><View style={[common.row,{justifyContent:'flex-end'}]}>{onConfirm&&<Pressable style={common.actionButton} onPress={onClose}><Text style={{color:colors.text,fontWeight:'800'}}>Cancelar</Text></Pressable>}<Pressable style={[common.button,{width:'auto',paddingHorizontal:22,backgroundColor:danger?colors.red:colors.blue}]} onPress={()=>{onConfirm?.();if(!onConfirm)onClose()}}><Text style={common.buttonText}>{confirmLabel}</Text></Pressable></View></View></View></Modal>
}
